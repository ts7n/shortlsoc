import React from 'react';

export default ({ children }: { children: React.ReactNode }) => (
  <html>
    <head>
      <title>lsoc.to</title>
      <link rel="stylesheet" href="/style.css" />
      <link rel="stylesheet" href="https://rsms.me/inter/inter.css" />
    </head>
    <body className="min-h-screen flex flex-col items-center justify-center bg-neutral-100 font-sans">
      <div className="flex flex-col items-center w-full">
        <div className="flex flex-col items-center">
          <a href="https://lsoc.to" className="text-4xl font-bold tracking-wide text-black leading-none">
            <span className="text-orange-600">lsoc</span>
            <span className="text-black">.to</span>
          </a>
          <span className="text-xs font-mono tracking-widest text-orange-600 mt-1">
            private link shortener
          </span>
        </div>
        <main className="my-10">
          {children}
        </main>

        <p className="text-xs font-mono text-black/40 tracking-widest">
          hosted by teddy lampert
        </p>
      </div>
    </body>
  </html>
)