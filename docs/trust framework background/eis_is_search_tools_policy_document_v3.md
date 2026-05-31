
September 2025, Samuel Mok (s.mok@utwente.nl) for the EIS-IS Team
December 2025, Marit van Eck, Final check by processing feedback from the team and overall document check
1. Purpose
This document is the EIS-IS team's internal reference framework for handling AI-based information search systems. It captures the definitions, principles, decision criteria, and governance arrangements that guide our work in this area. 
2. Context
This framework supports the library's ambition to provide trustworthy, easy-to-navigate resources. It aims to clarify when and how tools incorporating AI should be added to the list of supported tools and dovetails with the library web page "Databases A-Z". It is also designed to complement the university's promotion of the FAIR Guiding Principles, recognizing that reliable AI is built upon a foundation of Findable, Accessible, Interoperable, and Reusable data.
3. Definitions and scope
Artificial intelligence, in this document, is restricted to search systems that rely on non-deterministic, generative models like large language models. Tools that only incorporate deterministic techniques, like vector similarity, are not classed as AI unless the tool also performs generative synthesis or conversational interaction. This scope covers both stand-alone AI utilities and AI features bolted on to existing databases.
* Example (not an AI tool): Google Scholar uses vector embeddings for semantic search, which is a well-established, deterministic technology. It does not have generative capabilities.
* Example (AI-based tool): Semantic Scholar is classified as AI-based because, in addition to semantic search, it uses LLMs to add generative functionality, such as summarizing abstracts and identifying citation contexts.
4. Vision and objectives
The EIS-IS team will act as an informed intermediary between available tools and the university's need for reliable information retrieval. The objectives are:
1. To guarantee that any AI tool we recommend matches scholarly standards of rigor and transparency.
2. To give users the AI literacy to use such tools critically and effectively.
3. To keep our knowledge base and tooling up to date while avoiding in-house software development.
5. Evaluation framework: The TRUST Principles
All AI-based tools are evaluated against the five core TRUST principles. A tool must meet the threshold requirements within each principle to be considered for recommendation.
* T - Transparent: The tool's methodology, data sources, and limitations are clearly documented.
* R - Reliable: Its outputs are accurate, verifiable, and consistent; it does not "hallucinate" sources.
* U - User-centric: It is fit for academic use, integrates with standard research workflows, and is accessible.
* S - Secure: It protects user privacy and complies with GDPR, the AI Act, and SURF advice.
* T - Traceable: Every piece of information it generates can be traced back to a verifiable primary source.
6. Legal and ethical considerations
Evaluations must incorporate relevant legal and ethical standards.
* EU AI Act: We will consider the risk tiers defined in the Act. Most search tools are expected to be low-risk but will still require the transparency mandated by our TRUST framework.
* Copyright: The default stance is caution. Content may only be processed by AI if permitted by its license. The tool's ability to respect copyright is dependent on the clarity of the data usage licenses of its sources, as stipulated by the FAIR 'Reusable' principle.
* Data Protection: If a tool processes personal data in a way that could pose a risk, a data-protection impact assessment is mandatory before recommendation.
7. Example tool assessments
The following assessments are based on our TRUST evaluation form and serve as examples of its application.
* Recommended: ai2 Asta - Restricts answers to the Semantic Scholar corpus, exposes its reasoning chain, and is free and partly open-sourced. It excels in Traceability and Reliability.
* Needs review/provisional: Elicit - Valuable for abstract summarization, but its ranking algorithm is not fully disclosed, limiting its Transparency. The free tier is capped, affecting its User-centric score.
* Needs review/provisional: Consensus - Cites supporting papers but hides its source-selection logic, failing a key aspect of Traceability. Privacy and license terms require further examination.
* Not recommended: generic LLM Interfaces (e.g., ChatGPT, Gemini) and general search-focused AI (e.g., Perplexity) - These tools are prone to citation errors and lack rigorous, verifiable academic sources, failing the core principles of Reliability and Traceability.
8. Governance, roles, and responsibilities
The EIS-IS team owns the continuous cycle of testing and evaluation.
* Any team member can nominate a tool for review.
* At least two members will conduct and/or review an evaluation using the standardized TRUST form.
* Final decisions on a tool's recommendation status are made during a regular EIS-IS team meeting.
* Established library routes for budget and procurement are used for any potential paid subscriptions.
9. Implementation and tooling
The team's knowledge base of search tools will be maintained in the university's Microsoft 365 environment. We will use a workflow of MS Forms for data entry, Power Automate for data processing, and MS Lists to create a structured, user-facing database of evaluations.
10. Training and AI literacy
All team members will maintain baseline competence in generative AI principles, the TRUST framework, and relevant legal constraints. User-facing instruction will weave AI literacy into established information-skills sessions, mirroring CELT guidance: never enter sensitive data, always double-check output, and always acknowledge AI assistance.
11. Monitoring, metrics, and review cycle
The effectiveness of our recommendations can be tracked through usage statistics, user-satisfaction polls, and spot checks comparing AI results with conventional database searches. This framework and all tool entries will be reviewed and re-evaluated periodically.
12. Implementation roadmap
* Phase 1: Finalize and implement the interactive evaluation workflow (Forms/Lists). Develop a standardized protocol for tool evaluation and pilots.
* Phase 2: Systematically evaluate priority tools. Release a public-facing list of approved tools with user guides, dovetailing with the existing "Databases A-Z" overview on the library website. Incorporate tools into educational activities.
* Phase 3: Expand evaluation to AI features inside existing platforms and integrate with other AI-related policies and initiatives at the UT and beyond.



