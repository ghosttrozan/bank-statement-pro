# ── Stage 1: Build Java Spring Boot Application ──
FROM maven:3.9.6-eclipse-temurin-17 AS build
WORKDIR /app

# Cache Maven dependencies
COPY pom.xml .
RUN mvn dependency:go-offline -B

# Compile and package executable jar
COPY src ./src
RUN mvn clean package -DskipTests

# ── Stage 2: Slim Production Runtime ──
FROM eclipse-temurin:17-jre-jammy
WORKDIR /app

# Install font libraries for iText PDF vector rendering on Linux
RUN apt-get update && apt-get install -y --no-install-recommends fontconfig && rm -rf /var/lib/apt/lists/*

COPY --from=build /app/target/*.jar app.jar

# Render provides dynamic $PORT environment variable
ENV PORT=8080
EXPOSE 8080

ENTRYPOINT ["sh", "-c", "java -XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0 -Djava.security.egd=file:/dev/./urandom -jar app.jar --server.port=${PORT}"]
