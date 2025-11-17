import { Hono } from 'hono';
import { sign, verify } from 'hono/jwt';
import { getCookie } from 'hono/cookie';
import { env } from 'cloudflare:workers';
import { nanoid } from 'nanoid';
import Login from './views/login';
import Dashboard from './views/dashboard';
import Manage from './views/manage';

const app = new Hono();

// Auth middleware - reads email from JWT (from cookie or Authorization header)
const authMiddleware = async (c: any, next: any) => {
  const token = getCookie(c, 'auth_token') || c.req.header('Authorization')?.replace('Bearer ', '');
  if (!token) {
    return c.text('Unauthorized', 401);
  }
  try {
    const payload = await verify(token, env.JWT_SECRET);
    c.set('jwtPayload', payload);
    await next();
  } catch {
    return c.text('Unauthorized', 401);
  }
};

// OAuth2 endpoint
app.get('/oauth2', async (c) => {
  const code = c.req.query('code');
  
  // If no code, redirect to Google login
  if (!code) {
    const url = new URL(c.req.url);
    const redirectUri = `${url.origin}/oauth2`;
    const googleAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    googleAuthUrl.searchParams.set('client_id', env.GOOGLE_CLIENT_ID);
    googleAuthUrl.searchParams.set('redirect_uri', redirectUri);
    googleAuthUrl.searchParams.set('response_type', 'code');
    googleAuthUrl.searchParams.set('scope', 'openid email profile');
    return c.redirect(googleAuthUrl.toString());
  }

  // Exchange code for tokens
  const url = new URL(c.req.url);
  const redirectUri = `${url.origin}/oauth2`;
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });

  const tokens = await tokenResponse.json() as { access_token?: string; error?: string };
  if (!tokens.access_token) {
    return c.text('Failed to get access token', 400);
  }

  // Get user info
  const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  const user = await userResponse.json() as { email: string };

  // Check if email ends with allowed domains
  if (!user.email.endsWith('@latinschool.org') && !user.email.endsWith('@lsoc.org')) {
    return c.text('Only @latinschool.org and @lsoc.org emails can be used to login.', 403);
  }

  // Create JWT with email (expires in year 9999 - effectively forever)
  const token = await sign({ email: user.email, exp: 253402300799 }, env.JWT_SECRET);

  // Set cookie and redirect (Max-Age set to maximum 32-bit integer - effectively forever)
  c.header('Set-Cookie', `auth_token=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=2147483647`);
  return c.redirect('/');
});

app.get('/', async (c) => {
  const token = getCookie(c, 'auth_token') || c.req.header('Authorization')?.replace('Bearer ', '');
  if (token) {
    try {
      const payload = await verify(token, env.JWT_SECRET);
      if (payload.email) {
        return c.html(<Dashboard />);
      }
    } catch {
      // Invalid token, show login
    }
  }
  return c.html(<Login />);
});

app.post('/create', authMiddleware, async (c) => {
  const payload = c.get('jwtPayload') as { email: string };
  const body = await c.req.parseBody();
  const destination = body.destination as string;
  let name = (body.name as string)?.trim();

  if (!destination) {
    return c.text('Missing destination', 400);
  }

  // Generate nanoid if name is empty
  if (!name) {
    name = nanoid(8);
  }

  // Validate name length (minimum 5 characters)
  // if (name.length < 5) {
  //   return c.text('Slug must be at least 5 characters long', 400);
  // }

  // Validate name format (alphanumeric, dash, underscore only)
  if (!/^[a-zA-Z0-9-_]+$/.test(name)) {
    return c.text('Invalid name format', 400);
  }

  try {
    // Check if link already exists
    const existing = await env.D1.prepare('SELECT id FROM links WHERE id = ?').bind(name).first();
    if (existing) {
      return c.text('Link already exists', 409);
    }

    // Create the link
    await env.D1.prepare(
      'INSERT INTO links (id, name, creator, destination, created_at) VALUES (?, ?, ?, ?, ?)'
    ).bind(name, name, payload.email, destination, new Date().toISOString()).run();

    return c.redirect(`/${name}/manage`);
  } catch (error) {
    return c.text('Failed to create link', 500);
  }
});

// Manage page - owner only (must come before /:slug route)
app.get('/:slug/manage', authMiddleware, async (c) => {
  const slug = c.req.param('slug');
  const payload = c.get('jwtPayload') as { email: string };

  try {
    const link = await env.D1.prepare('SELECT creator FROM links WHERE id = ?').bind(slug).first() as { creator?: string } | null;
    
    if (!link) {
      return c.text('Link not found', 404);
    }

    if (link.creator !== payload.email) {
      return c.text('Unauthorized', 403);
    }

    const url = new URL(c.req.url);
    const shortUrl = `${url.origin}/${slug}`;
    
    return c.html(<Manage slug={slug} shortUrl={shortUrl} />);
  } catch (error) {
    return c.text('Failed to load manage page', 500);
  }
});

// Redirect route - increment clicks
app.get('/:slug', async (c) => {
  const slug = c.req.param('slug');
  
  try {
    const link = await env.D1.prepare('SELECT destination, clicks FROM links WHERE id = ?').bind(slug).first() as { destination?: string; clicks?: number } | null;
    
    if (!link) {
      return c.text('Link not found', 404);
    }

    // Increment clicks (handle case where clicks column might not exist yet)
    try {
      await env.D1.prepare('UPDATE links SET clicks = COALESCE(clicks, 0) + 1 WHERE id = ?').bind(slug).run();
    } catch {
      // Clicks column might not exist, ignore
    }

    return c.redirect(link.destination!);
  } catch (error) {
    return c.text('Failed to redirect', 500);
  }
});

// Get click count
app.get('/api/links/:slug/clicks', async (c) => {
  const slug = c.req.param('slug');

  try {
    const link = await env.D1.prepare('SELECT clicks FROM links WHERE id = ?').bind(slug).first() as { clicks?: number } | null;
    
    if (!link) {
      return c.json({ clicks: 0 }, 404);
    }

    return c.json({ clicks: link.clicks || 0 });
  } catch (error) {
    return c.json({ clicks: 0 }, 500);
  }
});

// Update destination - owner only
app.patch('/api/links/:slug', authMiddleware, async (c) => {
  const slug = c.req.param('slug');
  const payload = c.get('jwtPayload') as { email: string };
  const body = await c.req.json() as { destination?: string };

  if (!body.destination) {
    return c.text('Missing destination', 400);
  }

  try {
    const link = await env.D1.prepare('SELECT creator FROM links WHERE id = ?').bind(slug).first() as { creator?: string } | null;
    
    if (!link) {
      return c.text('Link not found', 404);
    }

    if (link.creator !== payload.email) {
      return c.text('Unauthorized', 403);
    }

    await env.D1.prepare('UPDATE links SET destination = ? WHERE id = ?').bind(body.destination, slug).run();

    return c.json({ success: true });
  } catch (error) {
    return c.text('Failed to update link', 500);
  }
});

// Delete link - owner only
app.delete('/api/links/:slug', authMiddleware, async (c) => {
  const slug = c.req.param('slug');
  const payload = c.get('jwtPayload') as { email: string };

  try {
    const link = await env.D1.prepare('SELECT creator FROM links WHERE id = ?').bind(slug).first() as { creator?: string } | null;
    
    if (!link) {
      return c.text('Link not found', 404);
    }

    if (link.creator !== payload.email) {
      return c.text('Unauthorized', 403);
    }

    await env.D1.prepare('DELETE FROM links WHERE id = ?').bind(slug).run();

    return c.json({ success: true });
  } catch (error) {
    return c.text('Failed to delete link', 500);
  }
});

export default app;