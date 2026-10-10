// isomorphic-ws's browser build only has a default export; midnight-js imports { WebSocket }.
const WS = globalThis.WebSocket;
export { WS as WebSocket };
export default WS;
