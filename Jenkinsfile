pipeline {
    agent any

    stages {
        stage('Build Docker Images') {
            steps {
                echo 'Building Docker Images using Docker Compose'
                sh 'docker compose -f "docker-compose.yml" up -d --build'
            }
        }
        

        stage('Cleaning up') {
            steps {
                echo 'Cleaning up unused Docker resources'
                sh 'docker system prune -f'
            }
        }
    }

    post {
        always {
            echo 'Cleaning workspace'
            cleanWs()
        }
    }
}
