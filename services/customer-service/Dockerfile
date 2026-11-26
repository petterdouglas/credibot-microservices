# Stage 1: Build (JDK 21 + Maven)
FROM maven:3.9.9-eclipse-temurin-21-alpine AS builder
WORKDIR /build

COPY pom.xml .
RUN mvn dependency:go-offline -B

COPY src ./src
RUN mvn clean package -DskipTests -B

# Stage 2: Runtime (JRE 21 Alpine, usuario nao-root)
FROM eclipse-temurin:21-jre-alpine AS runtime
WORKDIR /app

RUN addgroup -S credibot && adduser -S appuser -G credibot
COPY --from=builder /build/target/*.jar app.jar
RUN chown appuser:credibot app.jar

USER appuser

EXPOSE 8082

HEALTHCHECK --interval=15s --timeout=5s --start-period=120s --retries=6 \
    CMD wget -qO- http://127.0.0.1:${SERVER_PORT:-8082}/actuator/health || exit 1

ENTRYPOINT ["java", "-XX:+UseContainerSupport", "-XX:MaxRAMPercentage=75.0", "-jar", "app.jar"]
