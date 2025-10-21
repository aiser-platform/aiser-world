import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const headers = req.headers;
    res.status(200).json({ receivedHeaders: headers });
  } catch (err: any) {
    res.status(500).json({ error: String(err) });
  }
}


