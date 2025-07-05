;; Fact Verification Contract
;; Cross-references information accuracy and manages fact-checking

;; Constants
(define-constant CONTRACT_OWNER tx-sender)
(define-constant ERR_UNAUTHORIZED (err u200))
(define-constant ERR_CLAIM_EXISTS (err u201))
(define-constant ERR_CLAIM_NOT_FOUND (err u202))
(define-constant ERR_INVALID_STATUS (err u203))
(define-constant ERR_ALREADY_VERIFIED (err u204))

;; Data Variables
(define-data-var total-claims uint u0)
(define-data-var min-verifiers uint u3)
(define-data-var verification-reward uint u100)

;; Data Maps
(define-map fact-claims
  { claim-id: uint }
  {
    content-hash: (buff 32),
    submitter: principal,
    source-id: uint,
    status: (string-ascii 20),
    consensus-score: uint,
    total-verifications: uint,
    positive-verifications: uint,
    created-at: uint,
    resolved-at: (optional uint)
  }
)

(define-map verifications
  { claim-id: uint, verifier: principal }
  {
    verdict: bool,
    evidence: (string-ascii 500),
    confidence: uint,
    timestamp: uint,
    rewarded: bool
  }
)

(define-map verifier-stats
  { verifier: principal }
  {
    total-verifications: uint,
    accurate-verifications: uint,
    reputation-score: uint,
    tokens-earned: uint
  }
)

(define-map claim-evidence
  { claim-id: uint, evidence-id: uint }
  {
    evidence-type: (string-ascii 50),
    evidence-data: (string-ascii 1000),
    submitter: principal,
    verified: bool
  }
)

;; Public Functions

;; Submit a fact claim for verification
(define-public (submit-claim (content-hash (buff 32)) (source-id uint))
  (let
    (
      (claim-id (+ (var-get total-claims) u1))
      (current-block block-height)
    )
    (map-set fact-claims
      { claim-id: claim-id }
      {
        content-hash: content-hash,
        submitter: tx-sender,
        source-id: source-id,
        status: "pending",
        consensus-score: u0,
        total-verifications: u0,
        positive-verifications: u0,
        created-at: current-block,
        resolved-at: none
      }
    )

    (var-set total-claims claim-id)
    (ok claim-id)
  )
)

;; Submit verification for a claim
(define-public (verify-claim (claim-id uint) (verdict bool) (evidence (string-ascii 500)) (confidence uint))
  (let
    (
      (claim (unwrap! (map-get? fact-claims { claim-id: claim-id }) ERR_CLAIM_NOT_FOUND))
      (current-block block-height)
      (existing-verification (map-get? verifications { claim-id: claim-id, verifier: tx-sender }))
    )
    (asserts! (is-eq (get status claim) "pending") ERR_ALREADY_VERIFIED)
    (asserts! (is-none existing-verification) ERR_ALREADY_VERIFIED)
    (asserts! (<= confidence u100) ERR_INVALID_STATUS)

    ;; Record verification
    (map-set verifications
      { claim-id: claim-id, verifier: tx-sender }
      {
        verdict: verdict,
        evidence: evidence,
        confidence: confidence,
        timestamp: current-block,
        rewarded: false
      }
    )

    ;; Update claim statistics
    (let
      (
        (new-total (+ (get total-verifications claim) u1))
        (new-positive (if verdict
                        (+ (get positive-verifications claim) u1)
                        (get positive-verifications claim)))
        (new-consensus (if (> new-total u0)
                         (/ (* new-positive u100) new-total)
                         u0))
      )
      (map-set fact-claims
        { claim-id: claim-id }
        (merge claim {
          total-verifications: new-total,
          positive-verifications: new-positive,
          consensus-score: new-consensus
        })
      )
    )

    ;; Update verifier stats
    (match (map-get? verifier-stats { verifier: tx-sender })
      existing-stats
        (map-set verifier-stats
          { verifier: tx-sender }
          (merge existing-stats {
            total-verifications: (+ (get total-verifications existing-stats) u1)
          })
        )
      (map-set verifier-stats
        { verifier: tx-sender }
        {
          total-verifications: u1,
          accurate-verifications: u0,
          reputation-score: u50,
          tokens-earned: u0
        }
      )
    )

    (ok true)
  )
)

;; Resolve claim based on consensus
(define-public (resolve-claim (claim-id uint))
  (let
    (
      (claim (unwrap! (map-get? fact-claims { claim-id: claim-id }) ERR_CLAIM_NOT_FOUND))
      (current-block block-height)
      (min-verifications (var-get min-verifiers))
    )
    (asserts! (>= (get total-verifications claim) min-verifications) ERR_UNAUTHORIZED)
    (asserts! (is-eq (get status claim) "pending") ERR_ALREADY_VERIFIED)

    (let
      (
        (final-status (if (>= (get consensus-score claim) u60) "verified" "disputed"))
      )
      (map-set fact-claims
        { claim-id: claim-id }
        (merge claim {
          status: final-status,
          resolved-at: (some current-block)
        })
      )
      (ok final-status)
    )
  )
)

;; Add evidence to a claim
(define-public (add-evidence (claim-id uint) (evidence-id uint) (evidence-type (string-ascii 50)) (evidence-data (string-ascii 1000)))
  (let
    (
      (claim (unwrap! (map-get? fact-claims { claim-id: claim-id }) ERR_CLAIM_NOT_FOUND))
    )
    (map-set claim-evidence
      { claim-id: claim-id, evidence-id: evidence-id }
      {
        evidence-type: evidence-type,
        evidence-data: evidence-data,
        submitter: tx-sender,
        verified: false
      }
    )
    (ok true)
  )
)

;; Update verifier reputation
(define-public (update-verifier-reputation (verifier principal) (accurate-count uint))
  (let
    (
      (stats (unwrap! (map-get? verifier-stats { verifier: verifier }) ERR_CLAIM_NOT_FOUND))
      (total-verifications (get total-verifications stats))
      (new-reputation (if (> total-verifications u0)
                        (/ (* accurate-count u100) total-verifications)
                        u50))
    )
    (asserts! (is-eq tx-sender CONTRACT_OWNER) ERR_UNAUTHORIZED)

    (map-set verifier-stats
      { verifier: verifier }
      (merge stats {
        accurate-verifications: accurate-count,
        reputation-score: new-reputation
      })
    )
    (ok true)
  )
)

;; Read-only Functions

;; Get claim information
(define-read-only (get-claim (claim-id uint))
  (map-get? fact-claims { claim-id: claim-id })
)

;; Get verification details
(define-read-only (get-verification (claim-id uint) (verifier principal))
  (map-get? verifications { claim-id: claim-id, verifier: verifier })
)

;; Get verifier statistics
(define-read-only (get-verifier-stats (verifier principal))
  (map-get? verifier-stats { verifier: verifier })
)

;; Get claim evidence
(define-read-only (get-evidence (claim-id uint) (evidence-id uint))
  (map-get? claim-evidence { claim-id: claim-id, evidence-id: evidence-id })
)

;; Get total claims count
(define-read-only (get-total-claims)
  (var-get total-claims)
)

;; Check if claim is verified
(define-read-only (is-claim-verified (claim-id uint))
  (match (map-get? fact-claims { claim-id: claim-id })
    claim (is-eq (get status claim) "verified")
    false
  )
)
