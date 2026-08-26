package com.ecoFarm.service;

import com.ecoFarm.config.ResendProperties;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.Map;

/**
 * Thin wrapper around Resend's HTTP API — no SDK dependency, just a plain
 * POST with a bearer token. If no API key is configured (e.g. local dev),
 * this logs what would have been sent instead of failing, so nothing that
 * depends on "a user got created" breaks just because email isn't set up.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class EmailService {

    private final ResendProperties props;
    private final RestClient restClient = RestClient.create("https://api.resend.com");

    public void send(String to, String subject, String html) {
        if (props.getApiKey() == null || props.getApiKey().isBlank()) {
            log.warn("RESEND_API_KEY not configured — skipping email. Would have sent '{}' to {}", subject, to);
            return;
        }

        try {
            restClient.post()
                .uri("/emails")
                .header("Authorization", "Bearer " + props.getApiKey())
                .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
                .body(Map.of(
                    "from", props.getFrom(),
                    "to", List.of(to),
                    "subject", subject,
                    "html", html
                ))
                .retrieve()
                .toBodilessEntity();
        } catch (Exception ex) {
            // Never let an email provider hiccup take down the operation
            // that triggered it (e.g. creating a user) — log and move on.
            log.error("Failed to send email '{}' to {}: {}", subject, to, ex.getMessage());
        }
    }

    public void sendWelcomeEmail(String to, String firstName, String tenantName, String role,
                                  String loginEmail, String tempPassword, String loginUrl) {
        String greeting = firstName != null && !firstName.isBlank() ? "Hi " + firstName + "," : "Hi,";
        String html = """
            <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; color: #1a1a1a;">
              <h2 style="margin-bottom: 4px;">Welcome to EcoFarm</h2>
              <p>%s</p>
              <p>You've been added to <strong>%s</strong> as a <strong>%s</strong>.</p>
              <p>Here's how to sign in for the first time:</p>
              <table style="border-collapse: collapse; margin: 16px 0;">
                <tr><td style="padding: 4px 12px 4px 0; color: #666;">Email</td><td><strong>%s</strong></td></tr>
                <tr><td style="padding: 4px 12px 4px 0; color: #666;">Temporary password</td><td><strong>%s</strong></td></tr>
              </table>
              <p>This password only works once — you'll be asked to set your own password
                 immediately after signing in, before you can access anything else.</p>
              <p><a href="%s" style="display: inline-block; background: #16a34a; color: white;
                 padding: 10px 20px; border-radius: 6px; text-decoration: none;">Sign in</a></p>
              <p style="color: #888; font-size: 13px; margin-top: 24px;">
                 If you weren't expecting this, you can safely ignore this email.</p>
            </div>
            """.formatted(greeting, tenantName, role, loginEmail, tempPassword, loginUrl);

        send(to, "You've been added to " + tenantName + " on EcoFarm", html);
    }

    public void sendPasswordResetEmail(String to, String firstName, String tempPassword, String loginUrl) {
        String greeting = firstName != null && !firstName.isBlank() ? "Hi " + firstName + "," : "Hi,";
        String html = """
            <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; color: #1a1a1a;">
              <h2 style="margin-bottom: 4px;">Reset your password</h2>
              <p>%s</p>
              <p>We received a request to reset the password on your EcoFarm account. Use this
                 temporary password to sign back in:</p>
              <table style="border-collapse: collapse; margin: 16px 0;">
                <tr><td style="padding: 4px 12px 4px 0; color: #666;">Temporary password</td><td><strong>%s</strong></td></tr>
              </table>
              <p>This password only works once — you'll be asked to set your own password
                 immediately after signing in. Any other devices you were signed in on have
                 been signed out.</p>
              <p><a href="%s" style="display: inline-block; background: #16a34a; color: white;
                 padding: 10px 20px; border-radius: 6px; text-decoration: none;">Sign in</a></p>
              <p style="color: #888; font-size: 13px; margin-top: 24px;">
                 If you didn't request this, your password has already been changed to the
                 temporary one above — sign in with it and set a new password right away,
                 or contact your administrator.</p>
            </div>
            """.formatted(greeting, tempPassword, loginUrl);

        send(to, "Reset your EcoFarm password", html);
    }
}
