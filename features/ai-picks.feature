Feature: AI picks — the orb over a chat with two modes
  The owner's design of 2026-10-15 (seenit-frontend design/ai-picks): a page at /ai, the sixth word of the
  header's row, a living sphere over a glass chat. Each mode keeps its own log. Read-only: nothing is written.

  Scenario: The address opens the page with the orb and a greeting
    When I open the address "ai"
    Then the AI picks page shows the orb and greets with four suggestions
    And the address is "/ai"

  Scenario: Each mode keeps its own log, and the description mode says it is coming soon
    When I open the address "ai"
    And I write "щось веселе" to the AI
    Then the AI answers my words
    When I switch the AI to the description mode
    Then the description mode says soon and takes no words
    When I switch the AI back to picks
    Then my words to the AI are still in the log

  @phone-portrait
  Scenario: On a phone the header's sixth word is the short «AI», and the row fits
    When I open the address "ai"
    Then the header's AI word reads "AI" and no word of the row overflows its place
