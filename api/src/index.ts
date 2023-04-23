import express from 'express';

const main = async () => {
  const app = express();
  app.get('/', (_req, res) => {
    res.send('Hello World!');
  });
  app.listen(3000, () => {
    console.log('Server started on port 3000');
  });
}

main();
