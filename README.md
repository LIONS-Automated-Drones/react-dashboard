You will need these variables in your .env file. To figure
out what IP to use for the lang graph url, open powershell
and run `wsl hostname -I`.
```bash
NEXT_PUBLIC_ROS_STREAM_BASE_URL=http://localhost:8080
NEXT_PUBLIC_LANGGRAPH_URL=http://172.23.136.131:8000
```

This is a [Next.js](https://nextjs.org) project initially bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

Credits to Vercel, Shadcn, and Tailwind for facilitating the development of this project.

Be sure to install Next.js, Tailwind, and Shadcn before cloning this repo locally. Then, run the development server:
```bash
npm run dev
```
(or equivalent),

Lastly, open [http://localhost:3000](http://localhost:3000) with your browser to see the resulting ARES Dashboard.