package com.ecoFarm.domain.enums;

/**
 * Which group a non-toggle command belongs to on the live dashboard —
 * chosen explicitly by whoever creates the command, instead of being
 * guessed from its name. Toggle commands (offValue set) are always
 * classified as "section control" regardless of this field.
 */
public enum CommandCategory {
    TEMPERATURE,
    FOGGING,
    OTHER
}
