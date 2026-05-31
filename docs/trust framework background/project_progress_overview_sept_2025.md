



 


A Framework for Evaluating AI-Based Search Tools

Project progress report
& recommendations










Date: Friday, September 5, 2025
Author: Samuel Mok (s.mok@utwente.nl) for the LISA EIS-IS team
Contents
1.	Executive overview	3
2.	Our vision on  in academic search	3
3.	TRUST: from principle to practice	3
4.	From policy to operational standards	4
5.	Operationalizing TRUST	4
6.	Situating TRUST in context	4
7.	Proposed roadmap and priorities	5
8.	Appendices	6
a.	TRUST Evaluation Form v0.1	6
b.	Example filled-in form	6
c.	Sources and related documents	7



1.  Executive overview
This document summarizes the work undertaken by the EIS-IS team to address the proliferation of novel information search tools, AI-based and otherwise. Our primary objective has been to develop a systematic, principled method for evaluating these tools to ensure our recommendations to students and staff are reliable, ethical, and effective.
* What has been done: We have conducted an initial analysis of the novel search tool landscape, developed our own evaluation framework TRUST (Transparent, Reliable, User-centric, Secure, Traceable), created a draft policy and an evaluation checklist, and performed initial tool assessments. This work was developed collaboratively and discussed during our EIS-IS project day on July 10, 2025.
* What is proposed: We recommend the formal adoption of TRUST as the team's framework for search tool evaluation. We propose a phased plan to operationalize this standard, beginning with the development of an efficient, interactive evaluation workflow using university-supported Microsoft 365 tools, and prioritizing the creation of practical, user-facing guidance over the immediate finalization of a comprehensive internal policy.
* Decision required: We seek approval to proceed with the proposed roadmap, including the allocation of team resources for the systematic evaluation of tools and the development of user-facing guidance.
2. Our vision on "AI" in academic search
Our core philosophy is that novel search tools, including tools incorporation "AI" (e.g. large language models), should augment, and not replace (!), critical thinking and information literacy skills[K(1] of our users. As information specialists, our role is to act as informed intermediaries, guiding the UT community toward tools that enhance research without compromising academic integrity. This vision aligns with the library's strategic ambition to provide trustworthy, easy-to-navigate resources and supports the university's broader goal of fostering high-level AI literacy.
3. TRUST: from principle to practice
To structure our evaluations, we developed the TRUST framework, a set of five core principles inspired by the well-established FAIR guiding principles for data management (GO FAIR, no date[K(2]). A tool recommended by our team should be:
* Transparent: Methodology, data sources, and limitations are clearly documented.
* Reliable: Outputs are accurate, verifiable, and consistent. Sources exist, and are not "hallucinated".
* User-centric: Fit for academic use and integrates with standard research workflows.
* Secure: Protects user privacy and complies with GDPR and institutional/national/international policies.
* Traceable: Every piece of information generated and/or used can be traced back to a primary source.

This framework is the foundation of our evaluation checklist and our internal working methods.
4. From policy to operational standards
A key discussion point within our team has been the necessity and scope of a formal, comprehensive policy document at this stage. The consensus is that our immediate efforts should focus on practical application and tangible outputs rather than internal bureaucracy.
The need: A clear, shared set of guidelines is essential for consistent tool evaluation.
The challenge: The search tool landscape is evolving too rapidly for a static, exhaustive policy to remain relevant, and the same holds true for institutional, national, and international policies on AI-related topics. Furthermore, our team's role and responsibilities in the university's broader AI strategy are still being defined, making a definitive policy document premature.
Our advice: We propose to treat the existing draft policy not as a document to be finalized immediately, but as the detailed background rationale for our work. The TRUST framework and its associated evaluation form should serve as our official, but agile, operational standard. This approach allows us to begin working on evaluations immediately while deferring the creation of a formal, high-level policy document until a clear mandate and need are established by management. 
5. Operationalizing TRUST
To create an efficient, sustainable, and traceable evaluation process, we propose a partially automated digital workflow using MS Forms -> Excel -> MS Lists. We can use Microsoft Power Automate, a low-code tool included in our MS365 suite, to process filled-in forms into a database and/or generated actions.
That can be boiled down into these three steps:
1. Create an MS Forms version of the checklist: We will build a structured form based on TRUST. This ensures all evaluators submit consistent, well-defined data.
2. Set up MS Lists for storage and analysis: An MS List will be created in our team's SharePoint environment to act as the central, structured database for all tool evaluations.
3. Incorporate Power Automate: A simple automated "flow" will be configured. This flow will trigger every time a new MS Form is submitted, automatically taking the response data and creating a new, properly formatted item in our MS List.
This creates an automated pipeline from evaluation to a shared, sortable, and analyzable database, achieving our goal of a structured and efficient workflow.
6. Situating TRUST in context
Our approach is grounded in external regulations, institutional policies, and current academic research. The TRUST framework is compliant with the principles of the EU AI Act (European Parliament, 2024b, 2024a) and aligns with the University of Twente's policies on AI in Education (Universiteit Twente, 2023; Centre of Expertise in Learning and Teaching (CELT) et al., 2025). Our analysis of recent research on student AI use (Zheng et al., 2025) and AI tool comparisons (Patterson et al., 2025), as well as investigations of existing frameworks[K(3] (Hervieux and Wheatley, 2020) confirms that our focus on reliability, traceability, and user-centric design addresses critical gaps identified in both student behavior[K(4] and existing evaluation methods.
7.  Proposed roadmap and priorities
We recommend a phased approach that prioritizes practical implementation and user-facing value.
* Finalize and formally adopt the TRUST framework and evaluation form as our team's operational standard.
* Build the interactive evaluation workflow (MS Forms -> Power Automate -> MS Lists).
* Develop a clear internal workflow document for how the team will conduct evaluations, pilots, and record decisions in the new system.
* Begin systematically evaluating a priority list of tools (e.g., Inciteful, Litmaps, PURE suggest, AI Paperfinder, Elicit, ...) using the new digital workflow.
* Develop a public-facing page on the library website to share our findings and list recommended tools. 
* Create user guides, short videos, and other educational materials to promote AI literacy and the effective use of recommended tools.
* Adapt our educational materials and workshops to include our findings and recommended tools.
* Based on the experience gained during this process and external developments, revisit the need for a comprehensive, library-wide policy document in consultation with management.
* Establish a long-term governance model for continuous monitoring and integration with other AI-related policies at the UT and national level.


8. Appendices
a. TRUST Evaluation Form v0.1
[tool name/title] - [main url]
Transparent                                                                          Clear and complete documentation is available? T1. Data sourcesNotes? T2. Methodology? T3. Limitations, bias, updates
Reliable                                                                                                   Researchers can depend on the output? R1. Factually accurate and verifiable outputNotes? R2. Consistent and reproducible results? R3. Output is faithful to source material
User-Centric                                                                                                                      Fits within our workflow? U1. Aligns with UT needsNotes? U2. Integrates with our tools? U3. Useable for intended audience
Secure                                                                                                   Complies with all relevant regulations? S1. Complies with GDPRNotes? S2. Clear data policy? S3. Complies with safety guidelines
Traceable                                                                     All output can be traced back to a primary source? T4. Accurate source attribution in outputNotes? T5. All steps in the process are auditable
Conclusion: [Write your conclusion here: based on the checklist and whatever else, should we support this tool or not?]
Additional information, notes, screenshots, links, ... :
9. Example filled-in form[K(5]
Transparent                                                                          Clear and complete documentation is available?? T1. Data sourcesModel, database, and methods are documented, shown, and code is partly available in open source?? T2. Methodology?? T3. Limitations, bias, updates
Reliable                                                                                                   Researchers can depend on the output?? R1. Factually accurate and verifiable outputReasoning is clearly shown. Results always include direct links to the source material and are fully cited.?? R2. Consistent and reproducible results?? R3. Output is faithful to source material
User-Centric                                                                                                                      Fits within our workflow?? U1. Aligns with UT needsThe tool can easily be part of a regular search workflow and is built on a known database - Semantic Scholar - which is widely used in the  academic world.?? U2. Integrates with our tools?? U3. Useable for intended audience
Secure                                                                                                   Complies with all relevant regulations?? S1. Complies with GDPRThe core data, safety, and privacy policies are OK. However, at the time of writing, the tool uses Anthropics' Claude Sonnet 3.7 to process input - and there is no clear policy available for this part of the service. As Anthropic's own policies would pass the checks, especially regarding training on user input1,  we do not see this as a dealbreaker.?? S2. Clear data policy?? S3. Complies with safety guidelines
Traceable                                                                     All output can be traced back to a primary source?? T4. Accurate source attribution in outputThis is a core feature of the tool, and is excellently done.?? T5. All steps in the process are auditable
Conclusion: Highly recommended. Transparent tool built on a known database by a non-profit organization. Partly open-sourced code. Easy to use. Clear use case. Not only useful for direct results, but also to brainstorm for keywords searches, and even as a tool to learn how to search and evaluate sources.
Additional notes: Launched in March 2025 by the Allen institute for ai - AI2 - http://allen.ai/, which is a non-profit organization based in the US that focuses on developing open source AI models & tools, focusing on improving scientific workflows. They also develop numerous other things relevant to us: https://www.semanticscholar.org/ (a free and openly available scholarly database with various AI-based enhancements), https://allenai.org/olmo (a completely open source LLM model), and https://allenai.org/blog/ai2-scholarqa - which is similar to the paper finder tool but is focused on creating an answer instead of showing the search process.
a. Sources and related documents
Internal documents (MS Teams EIS --> General --> Search Tools Evaluation)
EIS-IS project day slides introducing TRUST: eis-is ai project day slides.pptx
EIS-IS V2 draft policy for novel search tools: eis_is_search_tools_policy_document_v2.docx 

Centre of Expertise in Learning and Teaching (CELT) et al. (2025) "GUIDELINES FOR THE SYSTEMATIC  INTEGRATION OF AI LITERACY INTO UT EDUCATION[K(6]." Universiteit Twente. Available at: https://canvas.utwente.nl/courses/15815/pages/how-to-incorporate-ai-literacy-into-ut-curricula-for-program-directors-and-curriculum-developers?module_item_id=549648.
European Parliament (2024a) "High-level summary of the AI Act | EU Artificial Intelligence Act," 30 May. Available at: https://artificialintelligenceact.eu/high-level-summary/ (Accessed: September 5, 2025).
European Parliament (2024b) Regulation (EU) 2024/1689 of the European Parliament and of the Council of 13 June 2024 laying down harmonised rules on artificial intelligence, 2024/1689. Available at: http://data.europa.eu/eli/reg/2024/1689/oj/eng (Accessed: September 5, 2025).
GO FAIR (no date) "FAIR Principles," GO FAIR. Available at: https://www.go-fair.org/fair-principles/ (Accessed: September 5, 2025).
Hervieux, S. and Wheatley, A. (2020) "The ROBOT Test," The LibrAIry, 11 March. Available at: https://thelibrairy.wordpress.com/2020/03/11/the-robot-test/ (Accessed: September 5, 2025).
Patterson, B. et al. (2025) "Which AI Tools Work Best for Research? Using Librarian and Student Perspectives to Inform a Rating Rubric," Journal of Electronic Resources in Medical Libraries, 22(3), pp. 133-138. Available at: https://doi.org/10.1080/15424065.2025.2546052.
Universiteit Twente (2023) "Use of AI in Education at the University of Twente." Available at: https://www.utwente.nl/en/education/student-services/news-events/news/2023/7/1041467/guidelines-for-using-ai-during-your-studies-at-ut.
Zheng, J. et al. (2025) "Do Students Rely on AI? Analysis of Student-ChatGPT Conversations from a Field Study." arXiv. Available at: https://doi.org/10.48550/arXiv.2508.20244.


1 "We will not use your Inputs or Outputs to train our models, unless: (1) your conversations are flagged for Trust & Safety review [...] (2) you've explicitly reported the materials to us [...], or (3) you've otherwise explicitly opted in to the use of your Inputs and Outputs for training purposes."

[K(1]Currently we focus mainly on search tools and I think that is the priority indeed.
I don't clearly recall, but have we discussed other application of AI in information literacy in the future? Such as formulating research questions and helping to build queries for various databases. I've been experimenting with it, and though not perfect, it is insightful.
[K(2]n.d.
is usually what I advise students to use in references with no date.
[K(3]I think this articles also provides interesting guiding questions for assessing AI tools for information literacy. Many are already addressed in the TRUST framework, but might provide some inspiration if needed in the future: https://doi.org/10.1177/03400352241304121 
[K(4]I feel this expresses a focus on the use of AI tools by students, but our target is for any UT-user in academic, right? 
[K(5]For ai2 paperfinder right? Should it also be mentioned at the start of this example form like it is mentioned in appendix a?
[K(6]Minor comment: APA doesn't use all caps even if the original title is fully capitalized. 
---------------

------------------------------------------------------------

---------------

------------------------------------------------------------



