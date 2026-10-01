Feature: Phone behaviour — portrait and landscape
  Covers BUGS #8: scroll-lock under modals with exact position restore,
  the add form fitting a 390px screen, the lock refcount, and landscape
  without sideways scroll. Adding lives in the search page, looking outside
  the app, since 2026-09-29; it is only ever opened and closed — saving is
  forbidden (REQ T-4).

  The lock HOLDS the page, it does not pin it (seenit-frontend #526,
  2026-09-27): the root is overflow hidden and the body stays in the flow.
  Pinning the body with position: fixed laid the home-screen app out short
  (a grey band under the strip), and overflow on the body as well made it a
  scroller of its own and took the sticky header off the top.

  @phone-portrait
  Scenario: The movie modal holds the page still and gives the position back
    Given I scroll the catalog to offset 400
    When I open a card visible at the current offset
    Then the page is held by its root, and the body is not pinned
    When I drag the page up with a finger
    Then the page behind the card has not moved
    When I close the modal
    Then scroll is unlocked and the position is restored
    And the page scrolls again under a finger

  @phone-portrait
  Scenario: The search outside the app fits the screen and leaves scroll free
    When I open the add modal
    Then the page has no sideways scroll
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
