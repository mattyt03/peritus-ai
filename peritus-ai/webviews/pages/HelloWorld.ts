import App from "../components/HelloWorld.svelte";

const app = new App({
  target: document.body,
});

export default app;

// maybe write contents to a new file in real time? or just write to sidebar component
// wtf is webpack and rollup
// rollup is compiling the svelte stuff, webpack is compiling the extension stuff
// had to add the --bundleConfigAsCjs to rollup -c -w to fix an error
// you don't have to explicitly list activation events
// what's the difference between modules and common js?
// learn how importing/exporting works in js

// we had to downgrade rollup-plugin-svelte to 6.1.1 to fix some problems with version 7
// ben downgraded to 6.0.0 but that also gave me errors

// i'm still getting this warning: (!) Plugin typescript: @rollup/plugin-typescript TS2307: Cannot find module '../components/Sidebar.svelte' or its corresponding type declarations.
// but everything seems to be working fine