// The film card's page object for one scenario, made once and kept in ctx:
// the steps of a scenario are separate functions, and two step files (modal,
// marks) talk to the same open card.
const { MovieModalPage } = require('../pages/MovieModalPage');

function modalOf(ctx, page) {
  if (!ctx.modal) ctx.modal = new MovieModalPage(page);
  return ctx.modal;
}

module.exports = { modalOf };
