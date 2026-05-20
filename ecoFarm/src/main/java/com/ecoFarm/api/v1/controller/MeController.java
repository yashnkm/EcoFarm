package com.ecoFarm.api.v1.controller;

import com.ecoFarm.api.v1.dto.request.ChangePasswordRequest;
import com.ecoFarm.api.v1.dto.request.UpdateProfileRequest;
import com.ecoFarm.api.v1.dto.response.UserResponse;
import com.ecoFarm.api.v1.mapper.UserMapper;
import com.ecoFarm.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/me")
@RequiredArgsConstructor
public class MeController {

    private final UserService userService;
    private final UserMapper mapper;

    @GetMapping
    public UserResponse me() {
        return mapper.toResponse(userService.currentUser());
    }

    @PatchMapping
    public UserResponse updateProfile(@Valid @RequestBody UpdateProfileRequest req) {
        return mapper.toResponse(userService.updateProfile(req));
    }

    @PatchMapping("/password")
    public ResponseEntity<Void> changePassword(@Valid @RequestBody ChangePasswordRequest req) {
        userService.changePassword(req);
        return ResponseEntity.noContent().build();
    }
}
