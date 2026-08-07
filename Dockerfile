#stage 1 of the dockerfile
FROM public.ecr.aws/docker/library/node:20-slim AS builder

WORKDIR /app

COPY package*.json ./

RUN npm install

# Build arguments for public variables in Next.js bundle
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY

ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
COPY . .

RUN npm run build

#stage 2
FROM gcr.io/distroless/nodejs20

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copy necessary static assets and standalone server output
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000

CMD ["server.js"]