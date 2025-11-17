import React from 'react';
import Layout from './_layout.tsx';

export default () => (
  <Layout>
    <a
      href="/oauth2"
      className="bg-orange-500 text-white font-semibold rounded-md px-6 py-2 hover:bg-orange-600 transition cursor-pointer active:scale-95 focus:outline-none focus:ring-2 focus:ring-orange-300 inline-block text-center select-none"
      tabIndex={0}
    >
      Login with Google
    </a>
  </Layout>
)