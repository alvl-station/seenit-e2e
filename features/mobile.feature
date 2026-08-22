Feature: Phone behaviour — portrait and landscape
  Covers BUGS #8: scroll-lock under modals with exact position restore,
  the add form fitting a 390px screen, the lock refcount, and landscape
  without sideways scroll. The add modal is only ever opened and closed —
  saving is forbidden (REQ T-4).

  @phone-portrait
  Scenario: The movie modal locks background scroll and restores the position
    Given I scroll the catalog to offset 400
    When I open a card visible at the current offset
    Then background scroll is locked via position fixed
    When I close the modal
    Then scroll is unlocked and the position is restored

  @phone-portrait
  Scenario: The add modal locks scroll and its form fits the screen
    When I open the add modal
    Then background scroll is locked
    And the page has no sideways scroll
    And the add modal is no wider than the screen
    When I close the add modal
    Then background scroll is unlocked

  @phone-portrait
  Scenario: Repeated modal open-close cycles leave scroll unlocked
    When I open the first card
    And I close the modal
    And I open the first card
    And I close the modal
    Then background scroll is unlocked

  @phone-landscape
  Scenario: Landscape renders without sideways scroll
    Then the catalog shows at least one movie
    And the page has no sideways scroll
    When I open the first card
    Then the page has no sideways scroll
    And I close the modal
