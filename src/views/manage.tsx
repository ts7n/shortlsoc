import React from 'react';
import Layout from './_layout.tsx';

export default ({ slug, shortUrl }: { slug: string; shortUrl: string }) => (
  <Layout>
    <div className="flex flex-col items-center gap-4 w-full max-w-2xl">
      <div className="w-full flex items-center gap-2">
        <input
          type="text"
          readOnly
          value={shortUrl}
          id="url-input"
          className="flex-1 px-3 py-2 border border-black/20 rounded-md bg-neutral-50 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-500"
        />
        <button
          id="copy-btn"
          className="bg-orange-500 text-white font-semibold rounded-md px-4 py-2 hover:bg-orange-600 transition cursor-pointer active:scale-95 focus:outline-none focus:ring-2 focus:ring-orange-300 whitespace-nowrap"
        >
          Copy
        </button>
      </div>

      <div className="w-full flex items-center justify-between text-sm">
        <span className="text-black/60">
          <span className="font-mono" id="click-count">-</span> clicks
        </span>
        <div className="flex gap-2">
          <button
            id="edit-btn"
            className="text-black/60 hover:text-black transition cursor-pointer"
          >
            Edit
          </button>
          <span className="text-black/20">·</span>
          <button
            id="delete-btn"
            className="text-red-500 hover:text-red-600 transition cursor-pointer"
          >
            Delete
          </button>
        </div>
      </div>
    </div>

    <script dangerouslySetInnerHTML={{ __html: `
      (function() {
        const shortUrl = ${JSON.stringify(shortUrl)};
        const slug = ${JSON.stringify(slug)};
        
        // Copy button
        document.getElementById('copy-btn').addEventListener('click', function() {
          const input = document.getElementById('url-input');
          input.select();
          navigator.clipboard.writeText(shortUrl).then(() => {
            const btn = this;
            const originalText = btn.textContent;
            btn.textContent = 'Copied!';
            setTimeout(() => {
              btn.textContent = originalText;
            }, 2000);
          });
        });
        
        // Edit button
        document.getElementById('edit-btn').addEventListener('click', async function() {
          const newUrl = window.prompt('Enter new destination URL:');
          if (!newUrl) return;
          
          try {
            const response = await fetch('/api/links/' + slug, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ destination: newUrl }),
            });
            
            if (response.ok) {
              alert('Destination updated successfully');
              window.location.reload();
            } else {
              alert('Failed to update destination');
            }
          } catch (error) {
            alert('Failed to update destination');
          }
        });
        
        // Delete button
        document.getElementById('delete-btn').addEventListener('click', async function() {
          if (!window.confirm('Are you sure you want to delete this link?')) return;
          
          try {
            const response = await fetch('/api/links/' + slug, {
              method: 'DELETE',
            });
            
            if (response.ok) {
              window.location.href = '/';
            } else {
              alert('Failed to delete link');
            }
          } catch (error) {
            alert('Failed to delete link');
          }
        });
        
        // Update click count
        function updateClickCount() {
          fetch('/api/links/' + slug + '/clicks')
            .then(res => res.json())
            .then(data => {
              const countEl = document.getElementById('click-count');
              if (countEl) {
                const clicks = data.clicks || 0;
                countEl.textContent = clicks.toLocaleString();
              }
            })
            .catch(err => console.error('Failed to fetch clicks', err));
        }
        
        updateClickCount();
        setInterval(updateClickCount, 5000);
      })();
    ` }} />
  </Layout>
);

