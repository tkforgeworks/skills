---
name: java-review
description: >
  Performs structured code review on Java/Spring Boot microservices and general Java projects.
  Use this skill whenever the user asks for a code review, PR review, architecture review,
  or wants feedback on Java, Spring Boot, Kafka, Keycloak, JPA/Hibernate, or microservice
  code quality. Also trigger when the user mentions "review my code", "check this PR",
  "look over this diff", "second set of eyes", or wants to evaluate Java code before merging.
---

# Java Review Skill

A structured code review skill tailored to Java/Spring Boot microservices development, covering both microservice architecture concerns and general Java best practices.

## When to Use

- User asks for a code review, PR review, or architecture review
- User shares a diff, code snippet, or asks you to examine source files
- User wants a "second set of eyes" before merging
- User asks about code quality, design patterns, or best practices in Java/Spring Boot

## Review Process

1. **Identify the review scope** — Is this a single file, a diff, a full service, or a cross-service review?
2. **Select the appropriate review lens** based on what's being reviewed (see sections below)
3. **Provide structured feedback** with severity levels: `CRITICAL`, `WARNING`, `SUGGESTION`
4. **Summarize** with a top-level assessment and prioritized action items

---

## Review Lens: Spring Boot Microservices

Use this lens when reviewing code from any Spring Boot microservices project.

### Architecture & Service Boundaries
- Is the service doing too much? Does it respect bounded context boundaries?
- Are cross-service calls using OpenFeign with proper error handling and circuit breakers?
- Is shared logic in the project's shared core/common module, or duplicated across services?
- Are Kafka events typed and following the project's event schema conventions?

### Spring Boot Specifics
- **Security:** JWT/Keycloak integration — is method-level security (`@PreAuthorize`, `@RolesAllowed`) applied correctly? Are endpoints that should be protected actually protected?
- **JPA/Hibernate:** N+1 query risks? Lazy vs eager loading appropriate? Are `@Transactional` boundaries correct?
- **Spring Profiles:** Are environment-specific configs properly separated? No hardcoded values that should be in `application.yml` or environment variables?
- **Dependency Injection:** Constructor injection preferred. Are beans scoped correctly?
- **Error Handling:** Consistent use of `@ControllerAdvice` and typed exception hierarchy? Are error responses following the project's response wrapper convention?

### Kafka / Event-Driven Patterns
- Are producers and consumers using Spring Cloud Stream bindings correctly?
- Are events idempotent? What happens if a message is processed twice?
- Are dead letter topics configured for failed messages?
- Is event payload versioning considered?

### Data Layer
- MapStruct DTO mappings — are they complete and tested?
- Redis caching — are cache keys namespaced? TTLs configured? Invalidation strategy clear?
- Database migrations — are they backward compatible?
- Pagination — is it applied where result sets could grow unbounded?

### Testing
- Unit tests with meaningful assertions (not just "it doesn't throw")
- Integration tests using Testcontainers where external dependencies are involved
- Are load test scenarios (e.g. Gatling) covering the critical paths?
- Contract tests for inter-service APIs

---

## Review Lens: General Java / Software Design

Use this lens for general Java code, design pattern implementations, data structures, algorithms, or non-Spring Java applications.

### Design & Patterns
- Correct and intentional application of design patterns (strategy, factory, builder, etc.)
- Single Responsibility — are classes and methods doing too much?
- Dependency inversion — are dependencies injected rather than created inline?
- Interface segregation — are interfaces focused or bloated?

### Code Quality
- Readability — are names descriptive? Is logic clear without requiring comments to decode?
- Dead code, unnecessary complexity, or over-engineering
- Proper use of Java features (streams, optionals, generics, records, sealed classes) vs misuse that reduces clarity
- Consistent formatting and style

### Correctness
- Null handling — are there NPE risks? Is `Optional` used appropriately?
- Exception handling — are exceptions caught at the right level? Checked vs unchecked used appropriately?
- Concurrency — if threads or shared state are involved, are there race conditions or visibility issues?
- Resource management — are `Closeable` resources handled with try-with-resources?

### Testing
- Are edge cases covered?
- Are tests testing behavior or just implementation details?
- Meaningful assertions vs trivial ones
- Test naming that describes the scenario, not the method

---

## Output Format

Structure your review as follows:

```
## Summary
(1-2 sentence overall assessment)

## Findings

### CRITICAL
(Issues that must be fixed — bugs, security gaps, data loss risks)

### WARNING
(Issues that should be fixed — performance problems, maintainability concerns, missing error handling)

### SUGGESTION
(Nice-to-haves — style improvements, minor refactors, readability tweaks)

## Action Items
(Prioritized list of what to address first)
```

If reviewing a diff/PR, reference specific files and line ranges. If reviewing a full codebase, organize findings by service or module.
