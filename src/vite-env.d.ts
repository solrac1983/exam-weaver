/// <reference types="vite/client" />

declare module '@tiptap/extension-link' {
  import { Mark } from '@tiptap/core';
  const Link: Mark<any, any>;
  export default Link;
  export { Link };
}
