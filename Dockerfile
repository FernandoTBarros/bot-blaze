FROM node:16-alpine AS ts-builder
WORKDIR /app
COPY . .
RUN yarn install
RUN yarn clean
RUN yarn build

FROM node:16-alpine AS prod
ENV NODE_ENV=production
WORKDIR /app
COPY --from=ts-builder /app/dist ./dist
COPY package.json tsconfig.json yarn.lock ./
RUN yarn install --production --silent
USER node
CMD yarn start