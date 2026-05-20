package com.ecoFarm.api.v1.mapper;

import com.ecoFarm.api.v1.dto.response.UserResponse;
import com.ecoFarm.domain.entity.User;
import org.springframework.stereotype.Component;

@Component
public class UserMapper {

    public UserResponse toResponse(User user) {
        return new UserResponse(
            user.getId(),
            user.getTenant().getId(),
            user.getEmail(),
            user.getFirstName(),
            user.getLastName(),
            user.getRole(),
            user.getStatus(),
            user.getActivatedAt(),
            user.getCreatedAt()
        );
    }
}
