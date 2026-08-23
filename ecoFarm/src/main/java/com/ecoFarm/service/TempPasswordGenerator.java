package com.ecoFarm.service;

import org.springframework.stereotype.Component;

import java.security.SecureRandom;

/**
 * Generates one-time temp passwords for invited users — shared by
 * {@link UserService} (inviting a user into an existing tenant) and
 * {@link TenantService} (provisioning a brand-new tenant's first admin).
 */
@Component
public class TempPasswordGenerator {

    private static final String ALPHABET =
        "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789"; // no 0/O/1/l/I — easy to misread from an email
    private static final SecureRandom RANDOM = new SecureRandom();

    public String generate() {
        StringBuilder sb = new StringBuilder(12);
        for (int i = 0; i < 12; i++) {
            sb.append(ALPHABET.charAt(RANDOM.nextInt(ALPHABET.length())));
        }
        return sb.toString();
    }
}
