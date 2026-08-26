package com.ecoFarm.api.v1.mapper;

import com.ecoFarm.api.v1.dto.response.EmailChangeRequestResponse;
import com.ecoFarm.domain.entity.EmailChangeRequest;
import com.ecoFarm.domain.entity.User;
import org.springframework.stereotype.Component;

@Component
public class EmailChangeRequestMapper {

    public EmailChangeRequestResponse toResponse(EmailChangeRequest r) {
        User u = r.getUser();
        String name = String.join(" ",
            u.getFirstName() != null ? u.getFirstName() : "",
            u.getLastName() != null ? u.getLastName() : "").trim();

        return new EmailChangeRequestResponse(
            r.getId(),
            u.getId(),
            name.isBlank() ? null : name,
            u.getEmail(),
            r.getRequestedEmail(),
            r.getNote(),
            r.getStatus(),
            r.getCreatedAt()
        );
    }
}
