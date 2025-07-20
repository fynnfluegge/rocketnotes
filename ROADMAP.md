# Project Roadmap

This document outlines the planned features and improvements for Rocketnotes.

## Future Features

### 1. PDF & OCR Content Ingestion

**Goal:** Allow users to upload PDF documents and make their content searchable and editable within the application. This will enable the import of academic papers, scanned documents, and other reference materials.

**Proposed Workflow:**

1.  **Frontend Upload:** The user uploads a PDF file through the `webapp`.
2.  **Backend Processing:** The file is sent to a new, dedicated Python handler (`handler-ocr`) in the `handler-py` project.
3.  **Content Extraction & Conversion:** The handler will use a specialized tool to convert the PDF into clean, structured Markdown.
    *   **Primary Tool (Open-Source):** [Marker](https://github.com/VikParuchuri/marker) is the recommended tool for this task. It excels at converting PDFs to high-quality Markdown, preserving formatting like headers, lists, and tables. It can be self-hosted within our `handler-py` service.
    *   **Alternative (Cloud-Based):** [Amazon Textract](https://aws.amazon.com/textract/) is a powerful, fully-managed AWS service ideal for enterprise-grade, scalable OCR. It integrates seamlessly with AWS Lambda and can handle complex documents, forms, and tables with high accuracy.
4.  **Note Creation:** The resulting Markdown text is saved as a new note in the system.
5.  **Indexing:** The new note's content is immediately indexed by the existing vector embedding system (`handler_vector_embeddings`) to make it available for semantic search.

**Key Benefits:**
*   Unlocks a vast amount of existing knowledge stored in PDFs.
*   Makes scanned, image-based documents fully searchable.
*   Integrates seamlessly with the existing note and search architecture.
