package com.credibot.customer.api.controller;

import com.credibot.customer.api.dto.CustomerDtos.CreateCustomerRequest;
import com.credibot.customer.api.dto.CustomerDtos.CustomerProfileResponse;
import com.credibot.customer.api.dto.CustomerDtos.WalletResponse;
import com.credibot.customer.api.exception.CustomerAlreadyExistsException;
import com.credibot.customer.api.exception.CustomerNotFoundException;
import com.credibot.customer.api.exception.WalletNotFoundException;
import com.credibot.customer.domain.model.Customer;
import com.credibot.customer.domain.model.Wallet;
import com.credibot.customer.domain.repository.CustomerRepository;
import com.credibot.customer.domain.repository.WalletRepository;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;

@RestController
@RequestMapping("/api/v1/customers")
public class CustomerController {

    private final CustomerRepository customerRepository;
    private final WalletRepository walletRepository;

    public CustomerController(CustomerRepository customerRepository, WalletRepository walletRepository) {
        this.customerRepository = customerRepository;
        this.walletRepository = walletRepository;
    }

    // GET /api/v1/customers/{id}
    @GetMapping("/{id}")
    public ResponseEntity<CustomerProfileResponse> getCustomer(@PathVariable String id) {
        Customer customer = customerRepository.findById(id)
                .orElseThrow(() -> new CustomerNotFoundException(id));

        return ResponseEntity.ok(new CustomerProfileResponse(
                customer.getId(),
                customer.getName(),
                customer.getEmail(),
                customer.getCpf(),
                customer.getMonthlyIncome(),
                customer.getKycStatus(),
                customer.isAccountBlocked()
        ));
    }

    // GET /api/v1/customers/{id}/wallet
    @GetMapping("/{id}/wallet")
    public ResponseEntity<WalletResponse> getWallet(@PathVariable String id) {
        // Verifica se o cliente existe
        if (!customerRepository.existsById(id)) {
            throw new CustomerNotFoundException(id);
        }

        Wallet wallet = walletRepository.findByCustomerId(id)
                .orElseThrow(() -> new WalletNotFoundException(id));

        return ResponseEntity.ok(new WalletResponse(
                wallet.getCustomerId(),
                wallet.getBalance(),
                wallet.getCurrency()
        ));
    }

    // POST /api/v1/customers
    @PostMapping
    public ResponseEntity<CustomerProfileResponse> createCustomer(@RequestBody CreateCustomerRequest request) {
        if (customerRepository.existsById(request.id())) {
            throw new CustomerAlreadyExistsException(request.id());
        }

        Customer customer = new Customer(request.id(), request.name(), request.email());
        if (request.cpf() != null) customer.setCpf(request.cpf());
        if (request.monthlyIncome() != null) customer.setMonthlyIncome(request.monthlyIncome());
        customer.setKycStatus("APPROVED");

        customerRepository.save(customer);

        // Cria carteira automaticamente
        Wallet wallet = new Wallet(customer.getId());
        walletRepository.save(wallet);

        CustomerProfileResponse response = new CustomerProfileResponse(
                customer.getId(),
                customer.getName(),
                customer.getEmail(),
                customer.getCpf(),
                customer.getMonthlyIncome(),
                customer.getKycStatus(),
                customer.isAccountBlocked()
        );

        return ResponseEntity.created(URI.create("/api/v1/customers/" + customer.getId())).body(response);
    }
}
