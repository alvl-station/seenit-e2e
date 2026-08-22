Feature: Auto-fetched facts are reference-only in the add form
  REQ A-6: year, rating, critic score, cast and awards come from TMDb / OMDb
  / Wikidata and must not be hand-editable — a stray keystroke there is a
  silent data corruption indistinguishable from fetched data once saved.
  The confirm card is only ever rendered and inspected, never submitted
  (REQ T-4: E2E must not write).

  Scenario: Fetched facts render as text while owned fields stay editable
    When I open the add modal and preview a fetched movie
    Then exactly the fetched facts are shown as read-only text
    And only the fields a person owns remain editable
    And the form explains that fetched facts cannot be edited
