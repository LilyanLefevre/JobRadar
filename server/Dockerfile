# JobRadar: PocketBase (comptes, CV, routes /jr/*) + interface. amd64 et arm64.
FROM alpine:3.20
ARG PB_VERSION=0.40.5
ARG TARGETARCH
RUN apk add --no-cache ca-certificates unzip \
 && f="pocketbase_${PB_VERSION}_linux_${TARGETARCH}.zip" \
 && base="https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}" \
 && wget -q "$base/$f" "$base/checksums.txt" \
 && grep " $f\$" checksums.txt | sha256sum -c - \
 && unzip -q "$f" -d /pb && rm "$f" checksums.txt
COPY pb_migrations /pb/pb_migrations
COPY pb_hooks /pb/pb_hooks
COPY pb_public /pb/pb_public
EXPOSE 8090
VOLUME /pb/pb_data
CMD ["/pb/pocketbase", "serve", "--http=0.0.0.0:8090", "--dir=/pb/pb_data", "--migrationsDir=/pb/pb_migrations", "--hooksDir=/pb/pb_hooks", "--publicDir=/pb/pb_public"]
