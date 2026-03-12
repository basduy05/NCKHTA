package com.example.eam;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.context.annotation.Bean;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@SpringBootApplication
@RestController
public class EamBackendApplication {

    public static void main(String[] args) {
        SpringApplication.run(EamBackendApplication.class, args);
    }

    @GetMapping("/")
    public String home() {
        return "EAM Backend is running on Render!";
    }


}
