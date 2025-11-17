import React from 'react';
import Layout from './_layout.tsx';

export default () => {
  return (
    <Layout>
      <form method="post" action="/create" className="flex items-center gap-2 w-full max-w-2xl" id="create-form">
        <input type="hidden" name="generated_id" id="generated-id-input" />
        <span className="font-mono text-black">lsoc.to/</span>
        <input
          type="text"
          id="name"
          name="name"
          pattern="[a-zA-Z0-9-_]+"
          required
          className="px-3 py-2 border border-black/20 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-500 w-30"
        />
      <span className="text-black/40">→</span>
      <input
        type="url"
        id="destination"
        name="destination"
        required
        placeholder="Destination URL"
        className="flex-1 px-3 py-2 border border-black/20 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-500"
      />
      <button
        type="submit"
        className="bg-orange-500 text-white font-semibold rounded-md px-4 py-2 hover:bg-orange-600 transition cursor-pointer active:scale-95 focus:outline-none focus:ring-2 focus:ring-orange-300 whitespace-nowrap"
      >
        Create
      </button>
    </form>
    <script dangerouslySetInnerHTML={{ __html: `
      (function() {
        // Generate nanoid on page load
        function generateNanoid(size) {
          const alphabet = 'useandom-26T198340PX75pxJACKVERYMINDBUSHWOLF_GQZbfghjklqvwyzrict';
          let id = '';
          const bytes = crypto.getRandomValues(new Uint8Array(size));
          for (let i = 0; i < size; i++) {
            id += alphabet[bytes[i] & 63];
          }
          return id;
        }
        
        const randomId = generateNanoid(8);
        const slugInput = document.getElementById('name');
        const generatedIdInput = document.getElementById('generated-id-input');
        
        // Set the generated ID as placeholder and store in hidden input
        generatedIdInput.value = randomId;
        slugInput.placeholder = randomId;
        
        const form = document.getElementById('create-form');
        
        form.addEventListener('submit', function(e) {
          const slugValue = slugInput.value.trim();
          if (!slugValue) {
            slugInput.value = generatedIdInput.value;
          } else if (slugValue.length < 5) {
            e.preventDefault();
            alert('Slug must be at least 5 characters long');
            slugInput.focus();
            return false;
          }
        });
      })();
    ` }} />
  </Layout>
  );
};

