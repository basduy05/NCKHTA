package com.example.eam.model;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Entity
@Table(name = "scores")
@Data
public class Score {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id")
    private Long userId;

    @Column(name = "activity_type")
    private String activityType; // QUIZ, GAME, ASSIGNMENT

    private Integer score;

    @Column(name = "max_score")
    private Integer maxScore;

    @Column(name = "completed_at")
    private LocalDateTime completedAt = LocalDateTime.now();
    
    // For manual creation
    public static Score create(Long userId, String activityType, Integer score, Integer maxScore) {
        Score s = new Score();
        s.setUserId(userId);
        s.setActivityType(activityType);
        s.setScore(score);
        s.setMaxScore(maxScore);
        return s;
    }
}
