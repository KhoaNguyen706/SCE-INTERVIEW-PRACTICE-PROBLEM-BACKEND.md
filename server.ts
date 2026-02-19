const Express = require("express");
import type { Request, Response } from "express";
const monitor = require("./services/monitor");
const app = Express();

app.use(Express.json());

app.get("/health", (req:Request, res:Response) => {
  res.json({ status: "ok" });
});

app.post("/start-monitoring", (req:Request, res:Response) => {
  const { symbol, minutes, seconds } = req.body;
  if (!symbol || typeof symbol !== 'string') return res.status(400).json({ error: 'symbol is required' });
  const result = monitor.startMonitor(symbol, Number(minutes) || 0, Number(seconds) || 0);
  res.json(result);
});

app.get('/history', (req: Request, res: Response) => {
  const symbol = (req.query.symbol as string) || '';
  if (!symbol) return res.status(400).json({ error: 'symbol query parameter is required' });
  const history = monitor.getHistory(symbol);
  res.json(history);
});

app.post('/refresh', async (req: Request, res: Response) => {
  const { symbol } = req.body;
  if (!symbol || typeof symbol !== 'string') return res.status(400).json({ error: 'symbol is required in body' });
  const record = await monitor.refreshNow(symbol);
  if (!record) return res.status(500).json({ error: 'failed to fetch' });
  res.json(record);
});

app.post('/stop-monitoring', (req: Request, res: Response) => {
  const { symbol } = req.body;
  if (!symbol || typeof symbol !== 'string') return res.status(400).json({ error: 'symbol is required in body' });
  const result = monitor.stopMonitor(symbol);
  res.json(result);
});

app.delete('/history', (req: Request, res: Response) => {
  const symbol = (req.query.symbol as string) || '';
  if (!symbol) return res.status(400).json({ error: 'symbol query parameter is required' });
  const result = monitor.deleteHistory(symbol);
  res.json(result);
});



app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
