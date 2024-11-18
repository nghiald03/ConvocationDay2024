pipeline {
    agent any

    stages {
        stage('Build Docker Images') {
            steps {
                echo 'Building Docker Images using Docker Compose'
                sh 'docker-compose build --pull'
            }
        }

        stage('Push Images to DockerHub') {
            steps {
                echo 'Tagging and Pushing Docker Images to DockerHub'
                withDockerRegistry(credentialsId: 'dockerhub', url: 'https://index.docker.io/v1/') {
                    sh '''
                        docker-compose push
                    '''
                }
            }
        }

        stage('Deploy Application') {
            steps {
                echo 'Stopping and removing existing containers'
                sh 'docker-compose down'

                echo 'Cleaning up unused Docker resources'
                sh 'docker system prune -f'

                echo 'Starting services with Docker Compose'
                sh 'docker-compose up -d'
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
