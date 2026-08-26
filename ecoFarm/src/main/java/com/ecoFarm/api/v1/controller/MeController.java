package com.ecoFarm.api.v1.controller;

import com.ecoFarm.api.v1.dto.request.ChangeEmailRequest;
import com.ecoFarm.api.v1.dto.request.ChangePasswordRequest;
import com.ecoFarm.api.v1.dto.request.RequestEmailChangeRequest;
import com.ecoFarm.api.v1.dto.request.UpdateProfileRequest;
import com.ecoFarm.api.v1.dto.response.UserResponse;
import com.ecoFarm.api.v1.mapper.UserMapper;
import com.ecoFarm.service.EmailChangeRequestService;
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
    private final EmailChangeRequestService emailChangeRequestService;

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

    @PatchMapping("/email")
    public ResponseEntity<Void> changeEmail(@Valid @RequestBody ChangeEmailRequest req) {
        userService.changeEmail(req);
        return ResponseEntity.noContent().build();
    }

    /** Fallback when the password check above can't be cleared — files a
     * request a tenant admin or super admin can approve or reject. */
    @PostMapping("/email-change-requests")
    public ResponseEntity<Void> requestEmailChange(@Valid @RequestBody RequestEmailChangeRequest req) {
        emailChangeRequestService.create(req);
        return ResponseEntity.noContent().build();
    }
}
