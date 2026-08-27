package com.ecoFarm.shared.exception;

import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(ApiException.class)
    public ResponseEntity<Map<String, Object>> handleApi(ApiException ex) {
        return ResponseEntity.status(ex.getStatus()).body(error(ex.getStatus(), ex.getMessage()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidation(MethodArgumentNotValidException ex) {
        Map<String, Object> body = error(HttpStatus.BAD_REQUEST, "Validation failed");
        body.put("fields", ex.getBindingResult().getFieldErrors().stream()
            .collect(Collectors.toMap(
                f -> f.getField(),
                f -> f.getDefaultMessage() == null ? "invalid" : f.getDefaultMessage(),
                (a, b) -> a
            )));
        return ResponseEntity.badRequest().body(body);
    }

    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<Map<String, Object>> handleAuth(AuthenticationException ex) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
            .body(error(HttpStatus.UNAUTHORIZED, ex.getMessage()));
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<Map<String, Object>> handleDenied(AccessDeniedException ex) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
            .body(error(HttpStatus.FORBIDDEN, "Access denied"));
    }

    // Spring Boot 3.2+ throws this for any request path that matches no
    // handler, instead of quietly falling back to a 404 error page — without
    // this, it fell through to handleGeneric() below and every routing typo
    // looked like a server crash.
    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<Map<String, Object>> handleNotFound(NoResourceFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
            .body(error(HttpStatus.NOT_FOUND, "Not found"));
    }

    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<Map<String, Object>> handleMethodNotAllowed(HttpRequestMethodNotSupportedException ex) {
        return ResponseEntity.status(HttpStatus.METHOD_NOT_ALLOWED)
            .body(error(HttpStatus.METHOD_NOT_ALLOWED, "Method not allowed"));
    }

    // Postgres includes the referencing table's name in a FK violation's
    // detail line, e.g. "...Detail: Key (id)=(...) is still referenced
    // from table "sampling_group_channels"." — pulling it out turns "it
    // may still be referenced elsewhere" into "still referenced by a Data
    // Sampling group", which is the difference between a dead end and
    // something the user can actually go act on.
    private static final Pattern FK_REFERENCED_FROM = Pattern.compile("referenced from table \"(\\w+)\"");

    // Catches both: a unique-constraint clash slipping past a service's own
    // pre-check under a race, and a foreign-key violation from deleting
    // something still referenced elsewhere (e.g. a poll group that still has
    // data points attached) — both used to reach handleGeneric() as a 500.
    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<Map<String, Object>> handleDataIntegrity(DataIntegrityViolationException ex) {
        String cause = ex.getMostSpecificCause().getMessage();
        log.warn("Data integrity violation: {}", cause);
        return ResponseEntity.status(HttpStatus.CONFLICT).body(error(HttpStatus.CONFLICT, conflictMessage(cause)));
    }

    private String conflictMessage(String cause) {
        if (cause == null) return DEFAULT_CONFLICT_MESSAGE;
        Matcher m = FK_REFERENCED_FROM.matcher(cause);
        if (!m.find()) return DEFAULT_CONFLICT_MESSAGE;
        return "Can't complete this — it's still referenced by " + friendlyTableName(m.group(1)) + ". Remove that first, then try again.";
    }

    private static final String DEFAULT_CONFLICT_MESSAGE =
        "This operation conflicts with existing data — it may still be referenced elsewhere, or duplicate a value that must be unique.";

    private String friendlyTableName(String table) {
        return switch (table) {
            case "readings" -> "recorded readings";
            case "alerts" -> "alert history";
            case "alert_rules" -> "an alert rule";
            case "control_commands" -> "command history";
            case "communication_logs" -> "communication logs";
            case "system_event_logs" -> "system event logs";
            case "sampling_group_channels" -> "a Data Sampling group";
            case "sampling_groups" -> "a Data Sampling group";
            case "data_points" -> "a data point";
            case "poll_groups" -> "a poll group";
            case "command_templates" -> "a command";
            case "devices" -> "a device";
            case "device_profiles" -> "a device profile";
            case "zones" -> "a zone";
            case "sites" -> "a site";
            case "users" -> "a user";
            default -> table.replace("_", " ");
        };
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleGeneric(Exception ex) {
        log.error("Unhandled exception", ex);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
            .body(error(HttpStatus.INTERNAL_SERVER_ERROR, "Internal server error"));
    }

    private Map<String, Object> error(HttpStatus status, String message) {
        Map<String, Object> body = new HashMap<>();
        body.put("timestamp", Instant.now().toString());
        body.put("status", status.value());
        body.put("error", status.getReasonPhrase());
        body.put("message", message);
        return body;
    }
}
