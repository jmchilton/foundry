nextflow.enable.dsl = 2

process GREET {
    tag "$sample"

    input:
    val sample

    output:
    path 'greeting.txt', emit: greeting

    script:
    """
    echo '${params.greeting}, ${sample}' > greeting.txt
    """
}

workflow {
    samples = Channel.of('world')
    GREET(samples)
    emit:
    greeting = GREET.out.greeting
}
