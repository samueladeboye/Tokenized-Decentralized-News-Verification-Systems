;; Bias Detection Contract
;; Identifies editorial slant and perspective in news content

;; Constants
(define-constant CONTRACT_OWNER tx-sender)
(define-constant ERR_UNAUTHORIZED (err u300))
(define-constant ERR_CONTENT_EXISTS (err u301))
(define-constant ERR_CONTENT_NOT_FOUND (err u302))
(define-constant ERR_INVALID_BIAS_SCORE (err u303))
(define-constant ERR_INVALID_CATEGORY (err u304))

;; Data Variables
(define-data-var total-content uint u0)
(define-data-var bias-threshold uint u70)

;; Data Maps
(define-map content-analysis
  { content-id: uint }
  {
    content-hash: (buff 32),
    source-id: uint,
    submitter: principal,
    bias-score: uint,
    bias-category: (string-ascii 20),
    political-lean: (string-ascii 15),
    emotional-tone: uint,
    factual-density: uint,
    analyzed-at: uint,
    confirmed: bool
  }
)

(define-map bias-reports
  { content-id: uint, reporter: principal }
  {
    reported-bias: uint,
    bias-type: (string-ascii 30),
    evidence: (string-ascii 500),
    confidence: uint,
    timestamp: uint
  }
)

(define-map analyzer-stats
  { analyzer: principal }
  {
    total-analyses: uint,
    accurate-analyses: uint,
    reputation-score: uint,
    specialization: (string-ascii 50)
  }
)

(define-map bias-patterns
  { pattern-id: uint }
  {
    pattern-type: (string-ascii 50),
    keywords: (string-ascii 500),
    bias-weight: uint,
    accuracy-rate: uint,
    created-by: principal
  }
)

(define-map content-metrics
  { content-id: uint }
  {
    word-count: uint,
    sentiment-score: uint,
    objectivity-score: uint,
    source-diversity: uint,
    fact-to-opinion-ratio: uint
  }
)

;; Public Functions

;; Submit content for bias analysis
(define-public (analyze-content (content-hash (buff 32)) (source-id uint) (bias-score uint) (bias-category (string-ascii 20)) (political-lean (string-ascii 15)))
  (let
    (
      (content-id (+ (var-get total-content) u1))
      (current-block block-height)
    )
    (asserts! (<= bias-score u100) ERR_INVALID_BIAS_SCORE)

    (map-set content-analysis
      { content-id: content-id }
      {
        content-hash: content-hash,
        source-id: source-id,
        submitter: tx-sender,
        bias-score: bias-score,
        bias-category: bias-category,
        political-lean: political-lean,
        emotional-tone: u50,
        factual-density: u50,
        analyzed-at: current-block,
        confirmed: false
      }
    )

    (var-set total-content content-id)
    (ok content-id)
  )
)

;; Report bias in content
(define-public (report-bias (content-id uint) (reported-bias uint) (bias-type (string-ascii 30)) (evidence (string-ascii 500)) (confidence uint))
  (let
    (
      (content (unwrap! (map-get? content-analysis { content-id: content-id }) ERR_CONTENT_NOT_FOUND))
      (current-block block-height)
    )
    (asserts! (<= reported-bias u100) ERR_INVALID_BIAS_SCORE)
    (asserts! (<= confidence u100) ERR_INVALID_BIAS_SCORE)

    (map-set bias-reports
      { content-id: content-id, reporter: tx-sender }
      {
        reported-bias: reported-bias,
        bias-type: bias-type,
        evidence: evidence,
        confidence: confidence,
        timestamp: current-block
      }
    )

    ;; Update analyzer stats
    (match (map-get? analyzer-stats { analyzer: tx-sender })
      existing-stats
        (map-set analyzer-stats
          { analyzer: tx-sender }
          (merge existing-stats {
            total-analyses: (+ (get total-analyses existing-stats) u1)
          })
        )
      (map-set analyzer-stats
        { analyzer: tx-sender }
        {
          total-analyses: u1,
          accurate-analyses: u0,
          reputation-score: u50,
          specialization: "general"
        }
      )
    )

    (ok true)
  )
)

;; Update content metrics
(define-public (update-content-metrics (content-id uint) (word-count uint) (sentiment-score uint) (objectivity-score uint) (source-diversity uint) (fact-to-opinion-ratio uint))
  (let
    (
      (content (unwrap! (map-get? content-analysis { content-id: content-id }) ERR_CONTENT_NOT_FOUND))
    )
    (asserts! (is-eq tx-sender (get submitter content)) ERR_UNAUTHORIZED)
    (asserts! (<= sentiment-score u100) ERR_INVALID_BIAS_SCORE)
    (asserts! (<= objectivity-score u100) ERR_INVALID_BIAS_SCORE)

    (map-set content-metrics
      { content-id: content-id }
      {
        word-count: word-count,
        sentiment-score: sentiment-score,
        objectivity-score: objectivity-score,
        source-diversity: source-diversity,
        fact-to-opinion-ratio: fact-to-opinion-ratio
      }
    )

    ;; Update content analysis with new emotional tone and factual density
    (map-set content-analysis
      { content-id: content-id }
      (merge content {
        emotional-tone: sentiment-score,
        factual-density: fact-to-opinion-ratio
      })
    )

    (ok true)
  )
)

;; Add bias detection pattern
(define-public (add-bias-pattern (pattern-id uint) (pattern-type (string-ascii 50)) (keywords (string-ascii 500)) (bias-weight uint))
  (begin
    (asserts! (is-eq tx-sender CONTRACT_OWNER) ERR_UNAUTHORIZED)
    (asserts! (<= bias-weight u100) ERR_INVALID_BIAS_SCORE)

    (map-set bias-patterns
      { pattern-id: pattern-id }
      {
        pattern-type: pattern-type,
        keywords: keywords,
        bias-weight: bias-weight,
        accuracy-rate: u0,
        created-by: tx-sender
      }
    )
    (ok true)
  )
)

;; Confirm bias analysis
(define-public (confirm-analysis (content-id uint))
  (let
    (
      (content (unwrap! (map-get? content-analysis { content-id: content-id }) ERR_CONTENT_NOT_FOUND))
    )
    (asserts! (is-eq tx-sender CONTRACT_OWNER) ERR_UNAUTHORIZED)

    (map-set content-analysis
      { content-id: content-id }
      (merge content { confirmed: true })
    )
    (ok true)
  )
)

;; Update analyzer reputation
(define-public (update-analyzer-reputation (analyzer principal) (accurate-count uint) (specialization (string-ascii 50)))
  (let
    (
      (stats (unwrap! (map-get? analyzer-stats { analyzer: analyzer }) ERR_CONTENT_NOT_FOUND))
      (total-analyses (get total-analyses stats))
      (new-reputation (if (> total-analyses u0)
                        (/ (* accurate-count u100) total-analyses)
                        u50))
    )
    (asserts! (is-eq tx-sender CONTRACT_OWNER) ERR_UNAUTHORIZED)

    (map-set analyzer-stats
      { analyzer: analyzer }
      (merge stats {
        accurate-analyses: accurate-count,
        reputation-score: new-reputation,
        specialization: specialization
      })
    )
    (ok true)
  )
)

;; Read-only Functions

;; Get content analysis
(define-read-only (get-content-analysis (content-id uint))
  (map-get? content-analysis { content-id: content-id })
)

;; Get bias report
(define-read-only (get-bias-report (content-id uint) (reporter principal))
  (map-get? bias-reports { content-id: content-id, reporter: reporter })
)

;; Get analyzer statistics
(define-read-only (get-analyzer-stats (analyzer principal))
  (map-get? analyzer-stats { analyzer: analyzer })
)

;; Get bias pattern
(define-read-only (get-bias-pattern (pattern-id uint))
  (map-get? bias-patterns { pattern-id: pattern-id })
)

;; Get content metrics
(define-read-only (get-content-metrics (content-id uint))
  (map-get? content-metrics { content-id: content-id })
)

;; Get total content count
(define-read-only (get-total-content)
  (var-get total-content)
)

;; Check if content has high bias
(define-read-only (has-high-bias (content-id uint))
  (match (map-get? content-analysis { content-id: content-id })
    content (>= (get bias-score content) (var-get bias-threshold))
    false
  )
)

;; Get bias threshold
(define-read-only (get-bias-threshold)
  (var-get bias-threshold)
)
