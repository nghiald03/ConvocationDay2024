pipeline {
    agent any

    stages {
        stage('Packaging') {
            steps {
                    sh 'docker build --pull --rm -f Dockerfile -t convocation:latest .'
            }
        }

        stage('Push to DockerHub') {
            steps {
                withDockerRegistry(credentialsId: 'dockerhub', url: 'https://index.docker.io/v1/') {
                    sh 'docker tag convocation:latest chalsfptu/convocation:latest'
                    sh 'docker push chalsfptu/convocation:latest'
                }
            }
        }

        stage('Deploy') {
            steps {
                
                    echo 'Deploying and cleaning'
                    sh 'docker container stop convocation || echo "this container does not exist"'
                    sh 'echo y | docker system prune'
                    sh '''
                        docker container run -d --name convocation -p 3001:3000 chalsfptu/convocation
                    '''
                }
        }
    }

    post {
        always {
            cleanWs()
        }
    }
}
