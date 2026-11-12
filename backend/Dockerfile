FROM golang:1.24-alpine AS build
RUN apk add --no-cache gcc musl-dev
WORKDIR /src
COPY go.mod go.sum* ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=1 GOOS=linux go build -trimpath -o /fitquest-api .

FROM alpine:3.22
RUN apk add --no-cache ca-certificates sqlite-libs && mkdir -p /data
COPY --from=build /fitquest-api /usr/local/bin/fitquest-api
WORKDIR /data
EXPOSE 8080
CMD ["/usr/local/bin/fitquest-api"]
