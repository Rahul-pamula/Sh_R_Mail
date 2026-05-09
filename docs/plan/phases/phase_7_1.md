# Phase 7.1: Global Billing & Payment Gateway

## 1. Executive Summary
Phase 7.1 provides the transactional engine for the platform. It bridges the gap between usage limits (Phase 7) and revenue collection, allowing for automated subscription management, localized pricing, and compliant payment processing.

### Core Objectives
*   **Transactional Integrity**: Reliable integration with Stripe and Razorpay.
*   **Global Compliance**: RBI-compliant recurring billing for India and automated tax handling for international markets.
*   **Self-Service Billing**: Empowering tenants to manage their own plans, invoices, and payment methods.
*   **Revenue Protection**: Automated handling of failed payments and trial-to-paid conversions.

---

## 2. Payment Architecture

### 2.1 Webhook Lifecycle
The platform relies on an event-driven architecture to handle payment status updates asynchronously.

| Event | Action |
| :--- | :--- |
| `subscription.created` | Provisions plan limits and triggers welcome emails. |
| `invoice.paid` | Extends the active period and generates a downloadable PDF. |
| `invoice.payment_failed` | Triggers Phase 7 grace period logic and emails the tenant. |
| `subscription.deleted` | Reverts the tenant to the Free tier and pauses active campaigns. |

---

## 3. Localization & Compliance

### 3.1 INR & RBI Compliance (India)
For the Indian market, the system implements:
*   **Mandatory AFA**: Supporting Additional Factor of Authentication for recurring charges.
*   **E-Mandate Support**: Handling pre-transaction notifications as required by RBI.
*   **GST Handling**: Automated calculation and rendering of GST on invoices for Indian entities.

### 3.2 Global USD Flows
Standard Stripe Checkout flows for international customers with automated VAT/Tax calculation based on address.

---

## 4. UI/UX Workflows

### 4.1 Pricing Table
A clear, responsive matrix allowing users to compare tiers and initiate the checkout flow.

### 4.2 Billing Dashboard
A centralized "Manage Billing" area where users can:
*   View current usage vs. plan limits (synced from Phase 7).
*   Download historical invoices.
*   Update credit card or payment methods via a secure portal.

---

## 5. Delivery Checklist

| Feature | Status | Note |
| :--- | :--- | :--- |
| **Stripe Integration** | ⏳ PLANNED | Checkout sessions & Webhook handlers. |
| **Razorpay / RBI** | ⏳ PLANNED | E-mandate & GST support. |
| **Pricing UI** | ⏳ PLANNED | Responsive tier comparison matrix. |
| **Billing Dashboard** | ⏳ PLANNED | Usage tracking & invoice history. |
| **Auto-Invoicing** | ⏳ PLANNED | Email delivery of PDF receipts. |

---
**Document Version**: 1.0.0  
**Last Updated**: 2026-05-09  
**Owner**: Platform Engineering Team
