FROM node:20-alpine

RUN apk add --no-cache bash \
  && adduser -D -h /home/sandbox sandbox \
  && mkdir -p /home/sandbox/.config/gh /home/sandbox/.aws /opt/sentryhulud /work /out \
  && chown -R sandbox:sandbox /home/sandbox /work /out

COPY canaries/.npmrc /home/sandbox/.npmrc
COPY canaries/aws-credentials /home/sandbox/.aws/credentials
COPY canaries/gh-hosts.yml /home/sandbox/.config/gh/hosts.yml
COPY state.cjs hooks.cjs capture-agent.cjs entrypoint.sh /opt/sentryhulud/

RUN chmod +x /opt/sentryhulud/entrypoint.sh \
  && chown -R sandbox:sandbox /home/sandbox /opt/sentryhulud

USER sandbox
WORKDIR /home/sandbox
ENTRYPOINT ["/opt/sentryhulud/entrypoint.sh"]
