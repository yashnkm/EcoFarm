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

    public void sendEmailChangeRequestNotification(String to, String adminFirstName, String requesterName,
                                                     String requesterEmail, String requestedEmail, String note,
                                                     String loginUrl) {
        String greeting = adminFirstName != null && !adminFirstName.isBlank() ? "Hi " + adminFirstName + "," : "Hi,";
        String noteHtml = note != null && !note.isBlank()
            ? "<p style=\"color: #666;\">Their note: “" + escapeHtml(note) + "”</p>" : "";
        String html = """
            <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; color: #1a1a1a;">
              <h2 style="margin-bottom: 4px;">Email change request</h2>
              <p>%s</p>
              <p><strong>%s</strong> (%s) couldn't verify their password to change their own email,
                 and is asking you to update it for them.</p>
              <table style="border-collapse: collapse; margin: 16px 0;">
                <tr><td style="padding: 4px 12px 4px 0; color: #666;">Current email</td><td><strong>%s</strong></td></tr>
                <tr><td style="padding: 4px 12px 4px 0; color: #666;">Requested email</td><td><strong>%s</strong></td></tr>
              </table>
              %s
              <p>Review it from the Users page — verify their identity before approving.</p>
              <p><a href="%s" style="display: inline-block; background: #16a34a; color: white;
                 padding: 10px 20px; border-radius: 6px; text-decoration: none;">Sign in</a></p>
            </div>
            """.formatted(greeting, requesterName, requesterEmail, requesterEmail, requestedEmail, noteHtml, loginUrl);

        send(to, "Email change request from " + requesterName, html);
    }

    public void sendEmailChangeApprovedEmail(String to, String firstName, String loginUrl) {
        String greeting = firstName != null && !firstName.isBlank() ? "Hi " + firstName + "," : "Hi,";
        String html = """
            <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; color: #1a1a1a;">
              <h2 style="margin-bottom: 4px;">Your email has been updated</h2>
              <p>%s</p>
              <p>An administrator approved your request and this address is now the one you'll
                 sign in with.</p>
              <p><a href="%s" style="display: inline-block; background: #16a34a; color: white;
                 padding: 10px 20px; border-radius: 6px; text-decoration: none;">Sign in</a></p>
              <p style="color: #888; font-size: 13px; margin-top: 24px;">
                 If you didn't request this, contact your administrator right away.</p>
            </div>
            """.formatted(greeting, loginUrl);

        send(to, "Your EcoFarm email was updated", html);
    }

    public void sendEmailChangeRejectedEmail(String to, String firstName, String reason) {
        String greeting = firstName != null && !firstName.isBlank() ? "Hi " + firstName + "," : "Hi,";
        String reasonHtml = reason != null && !reason.isBlank()
            ? "<p style=\"color: #666;\">Reason given: “" + escapeHtml(reason) + "”</p>" : "";
        String html = """
            <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; color: #1a1a1a;">
              <h2 style="margin-bottom: 4px;">Email change request declined</h2>
              <p>%s</p>
              <p>An administrator declined your request to change your account's email.
                 Your email address hasn't changed.</p>
              %s
              <p>Contact your administrator if you have questions.</p>
            </div>
            """.formatted(greeting, reasonHtml);

        send(to, "Your EcoFarm email change request was declined", html);
    }

    /** The note/reason fields on email-change requests are free text typed
     * by a user — escape before splicing into HTML. */
    private String escapeHtml(String s) {
        return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;");
    }
}
