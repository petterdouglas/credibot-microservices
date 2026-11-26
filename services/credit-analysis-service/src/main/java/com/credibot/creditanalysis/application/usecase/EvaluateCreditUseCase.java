package com.credibot.creditanalysis.application.usecase;

import java.math.BigDecimal;
import java.util.Optional;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import com.credibot.creditanalysis.application.port.CreditEventPublisherPort;
import com.credibot.creditanalysis.domain.event.CreditApprovedEvent;
import com.credibot.creditanalysis.domain.event.CreditRejectedEvent;
import com.credibot.creditanalysis.domain.model.CreditAnalysis;
import com.credibot.creditanalysis.domain.model.CreditDecision;
import com.credibot.creditanalysis.domain.repository.CreditAnalysisRepository;
import com.credibot.creditanalysis.domain.score.CreditScoreEngine;

@Service
public class EvaluateCreditUseCase {

    private static final Logger log = LoggerFactory.getLogger(EvaluateCreditUseCase.class);

    private final CreditAnalysisRepository repository;
    private final CreditEventPublisherPort eventPublisher;
    private final CreditScoreEngine scoreEngine;

    public EvaluateCreditUseCase(
            CreditAnalysisRepository repository,
            CreditEventPublisherPort eventPublisher) {
        this.repository = repository;
        this.eventPublisher = eventPublisher;
        this.scoreEngine = new CreditScoreEngine();
    }

    public CreditAnalysis execute(String loanId, String customerId, BigDecimal amount, Integer installments) {
        Optional<CreditAnalysis> existing = repository.findByLoanId(loanId);
        if (existing.isPresent()) {
            log.info("Análise de crédito já registrada para o empréstimo {} (decisão={}); ignorando duplicata.",
                    loanId, existing.get().getDecision());
            return existing.get();
        }

        CreditAnalysis analysis = scoreEngine.analyze(loanId, customerId, amount, installments);
        CreditAnalysis saved = repository.save(analysis);

        if (saved.getDecision() == CreditDecision.APPROVED) {
            eventPublisher.publishApproved(new CreditApprovedEvent(
                    saved.getLoanId(),
                    saved.getCustomerId(),
                    saved.getAmount(),
                    saved.getScore(),
                    saved.getEvaluatedAt()
            ));
            log.info("Crédito APROVADO para empréstimo {} (score={})", saved.getLoanId(), saved.getScore());
        } else {
            eventPublisher.publishRejected(new CreditRejectedEvent(
                    saved.getLoanId(),
                    saved.getReason(),
                    saved.getEvaluatedAt()
            ));
            log.info("Crédito REJEITADO para empréstimo {} (score={}): {}",
                    saved.getLoanId(), saved.getScore(), saved.getReason());
        }

        return saved;
    }
}
