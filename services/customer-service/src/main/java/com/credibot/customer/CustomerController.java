package com.credibot.customer;

import java.math.BigDecimal;
import java.net.URI;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/v1/customers")
public class CustomerController {
    public record Registration(
            @NotBlank @Size(max = 120) String name,
            @NotNull @Pattern(regexp = "[0-9]{11}|[0-9]{3}\\.[0-9]{3}\\.[0-9]{3}-[0-9]{2}") String cpf,
            @NotBlank @Email @Size(max = 254) String email,
            @NotNull @PositiveOrZero @Digits(integer = 13, fraction = 2) BigDecimal monthlyIncome) {}

    public record Registered(String id, String name, String status) {}

    public record DepositRequest(
            @NotNull @Pattern(regexp = "[A-Za-z0-9_-]{1,64}") String loanId,
            @NotNull @Positive @Digits(integer = 13, fraction = 2) BigDecimal amount) {}

    public record DepositResponse(String transactionId, String customerId, BigDecimal newBalance, String status) {}

    private final CustomerService customers;

    public CustomerController(CustomerService customers) {
        this.customers = customers;
    }

    @PostMapping
    public ResponseEntity<Registered> register(@Valid @RequestBody Registration request) {
        String name = request.name().trim();
        String id = customers.register(name, request.cpf().replaceAll("[.-]", ""),
                request.email(), request.monthlyIncome());
        return ResponseEntity.created(URI.create("/api/v1/customers/" + id))
                .body(new Registered(id, name, "ACTIVE"));
    }

    @GetMapping("/{id}")
    public CustomerService.Profile profile(@PathVariable String id) {
        return customers.profile(id);
    }

    @GetMapping("/{id}/wallet")
    public CustomerService.Wallet wallet(@PathVariable String id) {
        return customers.wallet(id);
    }

    @PostMapping("/{id}/deposit")
    public DepositResponse deposit(@PathVariable String id, @Valid @RequestBody DepositRequest request) {
        customers.profile(id);
        var result = customers.deposit(id, request.loanId(), request.amount());
        if (result.failureReason() != null) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, result.failureReason());
        }
        return new DepositResponse(result.transactionId(), id, result.newBalance(), "COMPLETED");
    }
}
