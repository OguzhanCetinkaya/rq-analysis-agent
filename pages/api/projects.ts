import { NextApiRequest, NextApiResponse } from 'next';
import { Project, Document, Message } from '../../database';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  switch (req.method) {
    case 'GET':
      const projects = await Project.findAll({ include: [Document, Message] });
      res.status(200).json(projects);
      break;
    case 'POST':
      const { name, threadId } = req.body;
      const newProject = await Project.create({ name, threadId });
      res.status(201).json(newProject);
      break;
    case 'DELETE':
      const { id } = req.body;
      await Project.destroy({ where: { id } });
      res.status(204).end();
      break;
    default:
      res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}