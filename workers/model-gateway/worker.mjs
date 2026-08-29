import gateway from "./index.js";

export default Object.freeze({
  fetch(request, env, context) {
    return gateway.createGatewayHandler().fetch(request, env, context);
  },
});
