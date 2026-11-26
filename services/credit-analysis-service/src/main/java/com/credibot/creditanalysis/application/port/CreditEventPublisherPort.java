package com.credibot.creditanalysis.application.port;

import com.credibot.creditanalysis.domain.event.CreditApprovedEvent;
import com.credibot.creditanalysis.domain.event.CreditRejectedEvent;

public interface CreditEventPublisherPort {

    void publishApproved(CreditApprovedEvent event);

    void publishRejected(CreditRejectedEvent event);
}
