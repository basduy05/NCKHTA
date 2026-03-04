package com.example.eam.controller;

import com.example.eam.model.Score;
import com.example.eam.repository.ScoreRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/scores")
public class ScoreController {

    @Autowired
    private ScoreRepository scoreRepository;

    // Use Case 1: Học sinh xem điểm của mình (Hoặc Admin xem)
    @GetMapping("/{userId}")
    public List<Score> getScoresByUser(@PathVariable Long userId) {
        // Trong thực tế sẽ check thêm: userId == currentLoggedInUser OR currentUser == ADMIN
        return scoreRepository.findByUserId(userId);
    }

    // Use Case 2: Chỉ Admin (Giáo viên) mới được sửa/nhập điểm
    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public Score createScore(@RequestBody Score score) {
        return scoreRepository.save(score);
    }

    // Use Case 3: Chỉ Admin (Giáo viên) mới được cập nhật điểm sai
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public Score updateScore(@PathVariable Long id, @RequestBody Score scoreDetails) {
        Score score = scoreRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Score not found"));
        
        score.setScore(scoreDetails.getScore());
        score.setMaxScore(scoreDetails.getMaxScore());
        return scoreRepository.save(score);
    }
}
