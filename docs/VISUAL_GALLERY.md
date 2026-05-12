# 📸 ShrFlow Visual Gallery

This document provides a comprehensive visual tour of the ShrFlow platform, showcasing the deep implementation across all phases.

---

## 🔐 Authentication & Onboarding
The entry point of the platform, supporting Enterprise OAuth and secure credential management.

| Login Shell | Auth Preferences |
| :---: | :---: |
| ![Login](plan/screen_shots/Screenshot%202026-05-07%20at%209.03.21%E2%80%AFAM.png) | ![Auth Settings](plan/screen_shots/Screenshot%202026-05-07%20at%209.04.21%E2%80%AFAM.png) |

---

## 👥 Audience & Contacts Management
High-velocity contact engine capable of handling gigabyte-scale CSV imports and granular segmentation.

### Audience Dashboard
![Contacts Main](plan/screen_shots/Screenshot%202026-05-07%20at%209.10.03%E2%80%AFAM.png)

### Import Workflow (Step-by-Step)
| Step 1: Upload | Step 2: Mapping | Step 3: Processing |
| :---: | :---: | :---: |
| ![Upload](plan/screen_shots/Screenshot%202026-05-07%20at%209.06.36%E2%80%AFAM.png) | ![Mapping](plan/screen_shots/Screenshot%202026-05-07%20at%209.09.12%E2%80%AFAM.png) | ![Complete](plan/screen_shots/Screenshot%202026-05-07%20at%209.09.49%E2%80%AFAM.png) |

---

## 🎨 Creative & Templates
Visual library for managing MJML-based responsive email templates.

![Template Library](plan/screen_shots/Screenshot%202026-05-07%20at%209.20.10%E2%80%AFAM.png)

---

## 🚀 Campaign Orchestration
Fine-grained controls for scheduling, throttling, and monitoring dispatches.

| Campaign List | Scheduling |
| :---: | :---: |
| ![Campaigns](plan/screen_shots/Screenshot%202026-05-07%20at%209.30.00%E2%80%AFAM.png) | ![Throttling](plan/screen_shots/Screenshot%202026-05-07%20at%209.31.07%E2%80%AFAM.png) |

---

## 🛠️ Infrastructure & Settings
The "Engine Room" where AWS SES, Domain DKIM, and Sender Identities are configured.

### Sender Identities
![Senders](plan/screen_shots/Screenshot%202026-05-07%20at%2010.09.18%E2%80%AFAM.png)

### Workspace Preferences
![Preferences](plan/screen_shots/Screenshot%202026-05-07%20at%2010.11.04%E2%80%AFAM.png)

---

## 🏢 Enterprise Features
Scaling tools for agencies and large teams.

| Team Members | Franchise Accounts |
| :---: | :---: |
| ![Team](plan/screen_shots/Screenshot%202026-05-07%20at%2010.10.44%E2%80%AFAM.png) | ![Franchise](plan/screen_shots/Screenshot%202026-05-07%20at%2010.10.30%E2%80%AFAM.png) |

---

*Note: All screenshots captured from the production build running on Docker.*
