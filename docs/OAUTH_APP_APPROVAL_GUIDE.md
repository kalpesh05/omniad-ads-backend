# OmniAds App Review & Verification Guide

When integrating with third-party platforms like Meta (Facebook/Instagram) and Google, you must register your application and submit it for **App Review / Verification** before you can launch it to the public. 

This guide breaks down exactly what permissions we are requesting, where to apply, and **the exact legal/technical reasons you should provide to the review team** to ensure a smooth approval process.

---

## 1. Meta (Facebook & Instagram)
**Portal:** [Meta for Developers](https://developers.facebook.com/)
**App Type:** Business
**Products to Add:** Facebook Login for Business, Marketing API, Instagram Graph API

To allow users to log in, manage pages, and sync ad campaigns, we integrated several scopes in the `AdPlatformAuthenticator`. During the App Review process, Meta will ask you **why** you need each permission. You should also be prepared to record a short screencast of your application showing how a user logs in and views their data.

### Required Permissions & Justifications to Submit:

1. **`ads_management` & `ads_read`**
   * **Why we need it:** To fetch real-time ad performance metrics and allow users to pause, edit, or create advertising campaigns directly from the OmniAds dashboard.
   * **What to tell Meta:** *"OmniAds is a centralized advertising management suite. This permission is required to synchronize the user's active ad campaigns into our dashboard, display ROI metrics, and allow them to optimize or pause underperforming ads without leaving our platform."*

2. **`business_management` & `catalog_management`**
   * **Why we need it:** To let users select which Business Managers they want to link, and synchronize their product catalogs for dynamic eCommerce ads.
   * **What to tell Meta:** *"OmniAds allows agencies and businesses to manage multiple ad accounts. We use this permission to fetch the user's established Business Managers and synchronize their product catalogues so they can seamlessly run dynamic retargeting ads from our interface."*

3. **`pages_manage_ads`, `pages_manage_metadata`, `pages_read_engagement`**
   * **Why we need it:** To publish ad structures that impersonate or run on behalf of a specific Facebook Page, and to read the comment/like metrics off of those ads.
   * **What to tell Meta:** *"Our application requires these permissions to map ad campaigns to the user's authentic Facebook Pages, publish promotional content on their behalf, and aggregate the resulting engagement analytics into our reporting hub."*

4. **`instagram_basic`, `instagram_content_publish`, `instagram_manage_insights`**
   * **Why we need it:** To schedule Instagram posts and track follower demographics and profile engagement.
   * **What to tell Meta:** *"OmniAds features a social media scheduling calendar. We require these permissions to publish scheduled image or video content to the user's authenticated Instagram Professional account and return audience insights back into our analytics module."*

---

## 2. Google (Google Ads, Analytics, YouTube)
**Portal:** [Google Cloud Console](https://console.cloud.google.com/)
**App Type:** External Web Application

For Google, you will trigger an **OAuth Verification** review. Google is particularly strict. You will need a verified domain, a clear Privacy Policy, and a Terms of Service page hosted on your site *before* submitting.

Additionally, for Google Ads, you must register for a **Developer Token** inside your [Google Ads Manager Account](https://ads.google.com/) API Center.

### Required Scopes & Justifications to Submit:

1. **Google Ads API (`https://www.googleapis.com/auth/adwords`)**
   * **Why we need it:** To search streams, query GAQL, list accessible customers, and manipulate ad creatives natively.
   * **What to tell Google:** *"OmniAds is an advertising automation platform. We require the AdWords scope to authenticate users, retrieve their account hierarchies, read campaign performance statistics, and allow programmatic management of their Google search and display campaigns from our unified dashboard."*
   
2. **Google Analytics (`https://www.googleapis.com/auth/analytics`, `.readonly`, `.edit`)**
   * **Why we need it:** To merge GA4 insights (bounce rates, unique sessions) alongside Meta/Google ad spend data to calculate true ROAS (Return on Ad Spend). 
   * **What to tell Google:** *"OmniAds correlates top-level advertising spend with bottom-funnel website conversions. We require Analytics permissions to fetch website traffic metrics and conversion goals, allowing marketers to view comprehensive ROI reports. Edit permissions are used exclusively to programmatically configure conversion tracking tags if the user requests it."*

3. **YouTube API (`https://www.googleapis.com/auth/youtube`, `.readonly`)**
   * **Why we need it:** To fetch analytical metrics on promotional videos and schedule Youtube short/video uploads from the content planner.
   * **What to tell Google:** *"OmniAds includes a social content planner. We require the YouTube data scope to allow creators to schedule video uploads to their authenticated channels and fetch aggregate view metrics for their promotional content."*

---

## 3. LinkedIn (Marketing & Lead Gen)
**Portal:** [LinkedIn Developer Portal](https://www.linkedin.com/developers/)
**App Type:** Custom (Marketing Developer Platform)

LinkedIn requires you to create an app in their Developer Portal and request access to the **Marketing Developer Platform**. Their review process can take up to a week, and they require a demonstration of how their APIs will be utilized within your platform.

### Required Permissions & Justifications to Submit:

1. **`r_ads` & `rw_ads`**
   * **Why we need it:** To read performance metrics from LinkedIn ad campaigns and create/edit Sponsored Content natively.
   * **What to tell LinkedIn:** *"OmniAds is a unified dashboard for B2B marketers. We require these scopes to pull LinkedIn Campaign Manager statistics into our unified reporting interface and allow advertisers to modify campaign budgets or statuses without leaving our application."*

2. **`r_organization_social` & `w_organization_social`**
   * **Why we need it:** To schedule organic posts to the organization's company page and fetch follower engagement data.
   * **What to tell LinkedIn:** *"Our platform features a cross-channel content scheduler. We require these permissions to publish organic posts on behalf of the user's authenticated LinkedIn Company Page and analyze the resulting engagement."*

3. **`r_ads_leadgen_automation`** *(Optional, if adding lead forms)*
   * **Why we need it:** To synchronize lead generation form submissions from LinkedIn ads into our internal CRM or Export feature.
   * **What to tell LinkedIn:** *"OmniAds allows marketers to unify their leads. This scope will allow us to securely download lead form responses submitted to the user's active LinkedIn Lead Generation campaigns."*

---

### Pro-Tips For Smooth Approval:
- **Record a Screencast:** Both Google and Meta rely heavily on video proof. Use tools like Loom to record a 2-minute video showing the user clicking "Log in with Facebook", authorizing the permissions, and showing *exactly* where their analytics load into your application. If they can see the value of the integration visually, they will approve it swiftly.
- **Privacy Policy is Mandatory:** Your Privacy Policy must explicitly state what data you are collecting from external APIs, how it will be used (only for rendering their dashboard), and how they can request deletion of that data. (e.g., A "Data Deletion Request" contact form).
- **Google Security Assessment:** If you request "Restricted Scopes", Google might mandate a CASB security assessment which can cost $15,000+. Fortunately, standard Adwords, YouTube, and Analytics scopes are generally considered **Sensitive** (not Restricted), meaning you bypass the expensive assessment and only need standard manual verification.
